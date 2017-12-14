const mysql = require('mysql2/promise')
const express = require('express')
const cors = require('cors')
const crypto = require('crypto')
const compression = require('compression')
const parser = require('body-parser')
const config = require('config')
const jwt = require('jsonwebtoken')
const init = require('./init')
const pool = mysql.createPool(config.database)
const app = express()
app.use(cors())
app.use(parser.json())
app.use(compression())
const secure = (req, res, next) => {
  const token = req.get('authorization')
  if (!token) next('Authentication token not provided')
  else {
    try {
      const user = jwt.verify(token.replace('Bearer ', '').replace('bearer ', ''), config.jwt.secret)
      req.user = user
      next()
    } catch (err) {
      next(err)
    }
  }
}
app.post('/api/register', async (req, res, next) => {
  const password = crypto.createHash('sha256').update(req.body.password, 'utf8').digest('hex')
  const conn = await pool.getConnection()
  try {
    const result = await conn.query(`INSERT INTO users ( name, password, username) VALUES ( '${req.body.name}', '${password}', '${req.body.username}' );`)
    res.send(result)
  } catch (ex) {
    next(ex)
  }
  conn.release()
})
app.post('/api/login', async (req, res, next) => {
  const password = crypto.createHash('sha256').update(req.body.password, 'utf8').digest('hex')
  const query = `select id,username from users where username = '${req.body.username}' and password='${password}'`
  try {
    const conn = await pool.getConnection()
    const results = await conn.query(query).then(r => r[0])
    if (results.length === 0) next('Wrong username or password')
    else {
      const r = results[0]
      const user = {
        username: r.username,
        token: jwt.sign({ ...r }, config.jwt.secret)
      }
      res.send(user)
    }
    conn.release()
  } catch (err) {
    next(err)
  }
})
app.get('/api/user', secure, async (req, res, next) => {
  const query = 'select id,username,name from users'
  try {
    const conn = await pool.getConnection()
    const result = await conn.query(query).then(r => r[0])
    conn.release()
    res.send(result)
  } catch (err) {
    next(err)
  }
})
app.get('/api/user/:username', secure, async (req, res, next) => {
  const query = `select id,username,name,balance from users where id = '${req.user.id}'`
  const conn = await pool.getConnection()
  try {
    const result = await conn.query(query).then(r => r[0])
    res.send(result[0])
  } catch (err) {
    next(err)
  }
  conn.release()
})
app.post('/api/transfer', secure, async (req, res, next) => {
  const from = req.user.username
  const to = req.body.to
  const amount = req.body.amount
  const conn = await pool.getConnection()
  const fromaccs = await conn.query(`select * from users where username = '${from}'`).then(r => r[0])
  const toaccs = await conn.query(`select * from users where username = '${to}'`).then(r => r[0])
  if (toaccs.length === 0) next('Destination account not available')
  else if (fromaccs.length === 0) next('Source account not available')
  else if (fromaccs[0].balance < amount) next('Insufficient funds')
  else {
    await conn.query(`update users set balance=${fromaccs[0].balance - amount} where id = '${fromaccs[0].id}'`)
    await conn.query(`update users set balance=${toaccs[0].balance + amount} where id = '${toaccs[0].id}'`)
    const newbal = await conn.query(`select * from users where username = '${from}'`).then(r => r[0][0])
    res.send(newbal)
  }
  conn.release()
})
app.use((err, req, res, next) => {
  if (res.headersSent) next(err)
  else {
    res.statusCode = 500
    console.error(err)
    res.send({ error: err })
  }
})
app.listen(3001, async () => {
  console.log('Started bobby-tables API')
  await init.init()
  console.log('Initialization complete')
})
