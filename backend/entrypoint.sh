#!/bin/sh
# Entrypoint script for the backend container

echo "🚀 Starting backend setup..."

# Install dependencies
echo "📦 Installing dependencies..."
yarn install

# Run migrations
echo "🗂️  Running database migrations..."
npx prisma migrate deploy

# Check if seed has already been run (seed creates a flag file)
if [ ! -f /app/.seeded ]; then
    echo "🌱 Running initial database seed..."
    node prisma/seed.js
    
    # Create a flag file to indicate seeding is complete
    touch /app/.seeded
    echo "✅ Database seeded successfully"
else
    echo "⏭️  Database already seeded, skipping..."
fi

# Start the application
echo "▶️  Starting application..."
yarn start
