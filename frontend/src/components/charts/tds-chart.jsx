import { Title } from '@mantine/core';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Label,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

export default function TDSChart({ samples }) {
    return (
        <div>
            <Title order={4} style={{ marginBottom: '16px' }}>
                TDS (Total Dissolved Solids) Over Time
            </Title>
            <ResponsiveContainer width='100%' height={250}>
                <AreaChart data={samples}>
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
                            value='TDS (mg/L)'
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
                    <Area
                        type='monotone'
                        dataKey='tds'
                        stroke='#087f5b'
                        fill='#087f5b'
                        fillOpacity={0.6}
                        name='TDS (mg/L)'
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
