import { Title } from '@mantine/core';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export default function SIRProfileChart({ samples }) {
    const profileData = {};
    const colors = {
        susceptible: '#e03131', // Red for susceptible
        intermediate: '#f08c00', // Orange for intermediate
        resistant: '#7db344', // Green for resistant
    };

    samples.forEach((sample) => {
        const profile = (
            sample.predicted_sir_profile || 'unknown'
        ).toLowerCase();
        if (!profileData[profile]) {
            profileData[profile] = {
                count: 0,
                dates: [],
            };
        }
        profileData[profile].count += 1;
        profileData[profile].dates.push(
            new Date(sample.collection_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            }),
        );
    });

    const chartData = Object.entries(profileData).map(([profile, data]) => ({
        name: profile.charAt(0).toUpperCase() + profile.slice(1),
        value: data.count,
        dates: data.dates,
    }));

    return (
        <div>
            <Title order={4} style={{ marginBottom: '16px' }}>
                SIR Profile Distribution
            </Title>
            <ResponsiveContainer width='100%' height={250}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx='50%'
                        cy='50%'
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill='#8884d8'
                        dataKey='value'
                        labelStyle={{
                            fill: '#000',
                            fontWeight: 'bold',
                            fontSize: '12px',
                        }}
                    >
                        {chartData.map((entry, index) => {
                            const colorKey = entry.name.toLowerCase();
                            return (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={colors[colorKey] || '#999'}
                                />
                            );
                        })}
                    </Pie>
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload[0]) {
                                const data = payload[0].payload;
                                return (
                                    <div
                                        style={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            padding: '8px',
                                        }}
                                    >
                                        <p
                                            style={{
                                                margin: '0 0 4px 0',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            {data.name}
                                        </p>
                                        <p
                                            style={{
                                                margin: '0 0 4px 0',
                                            }}
                                        >
                                            Count: {data.value}
                                        </p>
                                        <p
                                            style={{
                                                margin: '0',
                                                fontSize: '12px',
                                            }}
                                        >
                                            Dates: {data.dates.join(', ')}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
