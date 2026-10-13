const mysql = require('mysql2/promise');
require('dotenv').config();

// Criar pool de conexões
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Testar conexão
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✓ MySQL conectado com sucesso');
        
        // Testar se as tabelas existem
        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`✓ Tabelas encontradas: ${tables.length}`);
        
        connection.release();
        return true;
    } catch (error) {
        console.error('✗ Erro ao conectar ao MySQL:', error.message);
        console.error('✗ Detalhes:', error.code || 'Sem código');
        return false;
    }
}

// Função helper para executar queries com tratamento
async function executeQuery(sql, params = []) {
    try {
        const [rows] = await pool.execute(sql, params);
        return { success: true, data: rows };
    } catch (error) {
        console.error('[DB] Erro na query:', sql);
        console.error('[DB] Parâmetros:', params);
        console.error('[DB] Erro:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = { pool, testConnection, executeQuery };