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

export default function DissolvedOxygenChart({ samples }) {
    return (
        <div>
            <Title order={4} style={{ marginBottom: '16px' }}>
                Dissolved oxygen over time
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
                        tick={{
                            fontSize: 12,
                            fill: '#000',
                            fontWeight: 'bold',
                        }}
                    >
                        <Label
                            value='Collection Date'
                            position='insideBottomRight'
                            offset={-5}
                            fill='#000'
                            fontWeight='bold'
                        />
                    </XAxis>
                    <YAxis
                        tick={{
                            fontSize: 12,
                            fill: '#000',
                            fontWeight: 'bold',
                        }}
                    >
                        <Label
                            value='Dissolved Oxygen (mg/L)'
                            angle={-90}
                            fill='#000'
                            fontWeight='bold'
                        />
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
                        dataKey='do'
                        stroke='#5f3dc4'
                        name='Dissolved Oxygen (mg/L)'
                        connectNulls
                        dot={{ r: 4 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
