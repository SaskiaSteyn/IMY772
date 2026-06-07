import { Title } from '@mantine/core';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Label,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

export default function WaterTemperatureChart({ samples }) {
    return (
        <div>
            <Title order={4} style={{ marginBottom: '16px' }}>
                Water Temperature Over Time
            </Title>
            <ResponsiveContainer width='100%' height={250}>
                <BarChart data={samples}>
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
                            value='Temperature (°C)'
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
                    <Bar
                        dataKey='water_temp'
                        fill='#364fc7'
                        name='Temperature (°C)'
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
