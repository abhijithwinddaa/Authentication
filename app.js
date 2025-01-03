const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const app = express()

app.use(express.json())

const dbPath = path.join(__dirname, 'userData.db')
let db = null

const initializeServerAndDb = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Started')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeServerAndDb()

const validatePassword = password => {
  return password.length >= 5
}

app.post('/register', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  const hashedPassword = await bcrypt.hash(password, 10)
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    if (validatePassword(password)) {
      const createUserQuery = `
        INSERT INTO user (username, name, password, gender, location)
        VALUES ('${username}', '${name}', '${hashedPassword}', '${gender}', '${location}')
      `
      await db.run(createUserQuery)
      response.send('User created successfully')
    } else {
      response.status(400).send('Password is too short')
    }
  } else {
    response.status(400).send('User already exists')
  }
})

app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    response.status(400).send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched) {
      response.send('Login success!')
    } else {
      response.status(400).send('Invalid password')
    }
  }
})

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    response.status(400).send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password)
    if (isPasswordMatched) {
      if (validatePassword(newPassword)) {
        const hashedNewPassword = await bcrypt.hash(newPassword, 10)
        const updatePasswordQuery = `
          UPDATE user SET password = '${hashedNewPassword}' WHERE username = '${username}'
        `
        await db.run(updatePasswordQuery)
        response.send('Password updated')
      } else {
        response.status(400).send('Password is too short')
      }
    } else {
      response.status(400).send('Invalid current password')
    }
  }
})

module.exports = app
