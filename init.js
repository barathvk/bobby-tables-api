const mysql = require('mysql2/promise')
const config = require('config')
const axios = require('axios')
const casual = require('casual')
const createstatement = `CREATE TABLE users ( 
	id BigInt( 255 ) AUTO_INCREMENT NOT NULL,
	username VarChar( 255 ) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
	name VarChar( 255 ) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
	balance BigInt( 255 ) NOT NULL DEFAULT '0',
	password VarChar( 255 ) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
	PRIMARY KEY ( id ),
	CONSTRAINT unique_id UNIQUE( id ),
	CONSTRAINT unique_username UNIQUE( username ) )
CHARACTER SET = utf8
COLLATE = utf8_general_ci
ENGINE = InnoDB
AUTO_INCREMENT = 1;`
const createUser = async (user, conn) => {
  await axios.post('http://localhost:3001/api/register', user)
  const balstmt = `update users set balance='${casual.integer(1, 1000)}' where username = '${user.username}'`
  await conn.query(balstmt)
}
const init = async () => {
  const conn = await mysql.createConnection(config.database)
  const drop = `DROP DATABASE IF EXISTS ${config.database.database}`
  const stmt = `CREATE DATABASE ${config.database.database};`
  await conn.query(drop)
  await conn.query(stmt)
  await conn.query(`USE ${config.database.database}`)
  await conn.query(createstatement)
  createUser({
    username: 'bobby.tables',
    name: 'Bobby Tables',
    password: 'bobby'
  }, conn)
  for (let i = 0; i < config.users; i++) {
    const user = {
      username: casual.username.toLowerCase().replace('_', '.'),
      name: casual.full_name,
      password: casual.password
    }
    await createUser(user, conn)
  }
}
module.exports = { init }
