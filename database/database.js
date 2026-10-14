
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.MYSQLHOST || process.env.DB_HOST,
    port: Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306),
    user: process.env.MYSQLUSER || process.env.DB_USER,
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
    database: process.env.DB_NAME || process.env.MYSQLDATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 10000
};

const pool = mysql.createPool(dbConfig);

async function testConnection() {
    let connection;

    try {
        console.log('[DB] Host:', dbConfig.host);
        console.log('[DB] Porta:', dbConfig.port);
        console.log('[DB] Banco:', dbConfig.database);

        connection = await pool.getConnection();

        console.log('✓ MySQL conectado com sucesso!');

        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`✓ Tabelas encontradas: ${tables.length}`);

        return true;
    } catch (error) {
        console.error('✗ Erro ao conectar ao MySQL');
        console.error('✗ Código:', error.code || 'N/A');
        console.error('✗ Mensagem:', error.message);

        return false;
    } finally {
        if (connection) connection.release();
    }
}

async function executeQuery(sql, params = []) {
    try {
        const [rows] = await pool.execute(sql, params);
        return { success: true, data: rows };
    } catch (error) {
        console.error('[DB] Erro na query:', error.code, error.message);
        return { success: false, error: error.message };
    }
}

module.exports = { pool, testConnection, executeQuery };
