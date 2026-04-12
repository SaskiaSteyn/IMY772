import { Title } from '@mantine/core';
import {
    CartesianGrid,
    Label,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

export default function PHLevelChart({ samples }) {
    return (
        <div>
            <Title order={4} style={{ marginBottom: '16px' }}>
                pH Level Over Time
            </Title>
            <ResponsiveContainer width='100%' height={250}>
                <LineChart data={samples}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis
                        dataKey={(sample) =>
                            new Date(sample.collection_date).toLocaleDateString(
                                'en-US',
                                {
                                    month: 'short',
                                    day: 'numeric',
                                },
                            )
                        }
                        tick={{ fontSize: 12 }}
                    >
                        <Label
                            value='Collection Date'
                            position='insideBottomRight'
                            offset={-5}
                        />
                    </XAxis>
                    <YAxis tick={{ fontSize: 12 }}>
                        <Label value='pH' angle={-90} />
                    </YAxis>
                    <Tooltip
                        formatter={(value) => {
                            if (typeof value === 'number') {
                                return value.toFixed(2);
                            }
                            return value || 'N/A';
                        }}
                    />
                    <Line
                        type='monotone'
                        dataKey='ph'
                        stroke='#8884d8'
                        name='pH Level'
                        connectNulls
                        dot={{ r: 4 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
