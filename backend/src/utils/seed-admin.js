import bcrypt from 'bcryptjs'
import prisma from '../../lib/prisma.js'

async function run() {
    const email = process.env.ADMIN_EMAIL?.trim()
    const password = process.env.ADMIN_PASSWORD
    const name = process.env.ADMIN_NAME?.trim() || 'Admin'
    const surname = process.env.ADMIN_SURNAME?.trim() || 'User'

    if (!email || !password) {
        console.error(
            'Missing ADMIN_EMAIL or ADMIN_PASSWORD. Add both to the project .env file before running seed:admin.'
        )
        process.exitCode = 1
        return
    }

    try {
        const existing = await prisma.user.findUnique({ where: { email } })

        if (existing) {
            await prisma.user.update({
                where: { userID: existing.userID },
                data: {
                    role: 'admin',
                    name,
                    surname,
                },
            })

            console.log(`Updated existing user (${email}) to role=admin`)
            return
        }

        const password_hash = await bcrypt.hash(password, 12)

        await prisma.user.create({
            data: {
                name,
                surname,
                email,
                password_hash,
                role: 'admin',
            },
        })

        console.log(`Created admin user ${email}`)
    } catch (error) {
        console.error('Failed to seed admin user:', error)
        process.exitCode = 1
    } finally {
        await prisma.$disconnect()
    }
}

run()
