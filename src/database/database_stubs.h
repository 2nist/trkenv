#pragma once

#include <string>
#include <vector>
#include <memory>
#include <unordered_map>

namespace trkenv {
namespace database {

/**
 * DatabaseStubs - Collection of database stub implementations and utilities
 * Provides mock database functionality for development and testing
 */
class DatabaseStubs {
public:
    // SQLite stub functions
    static bool initializeSQLite(const std::string& databasePath);
    static bool createTable(const std::string& tableName, const std::vector<std::string>& columns);
    static bool insertRecord(const std::string& tableName, const std::vector<std::pair<std::string, std::string>>& data);
    static std::vector<std::vector<std::string>> selectRecords(const std::string& tableName, const std::string& whereClause = "");
    static bool updateRecord(const std::string& tableName, const std::vector<std::pair<std::string, std::string>>& data, const std::string& whereClause);
    static bool deleteRecord(const std::string& tableName, const std::string& whereClause);
    static void closeSQLite();

    // Database schema creation helpers
    static bool createPluginTable();
    static bool createFlowGraphTable();
    static bool createConfigTable();
    static bool createAudioDataTable();

    // Test data generation
    static void populateTestData();
    static void clearAllTables();

    // Utility functions
    static std::string escapeString(const std::string& input);
    static std::string formatQuery(const std::string& query, const std::vector<std::string>& parameters);

private:
    static bool s_initialized;
    static std::string s_databasePath;
};

/**
 * MockSQLiteConnection - Mock SQLite connection for testing
 */
class MockSQLiteConnection {
public:
    MockSQLiteConnection(const std::string& databasePath);
    ~MockSQLiteConnection();

    bool open();
    void close();
    bool isOpen() const;

    // Query execution
    bool execute(const std::string& sql);
    std::vector<std::vector<std::string>> query(const std::string& sql);
    
    // Prepared statements (stub)
    struct PreparedStatement {
        std::string sql;
        std::vector<std::string> parameters;
    };
    
    std::shared_ptr<PreparedStatement> prepare(const std::string& sql);
    bool executeStatement(std::shared_ptr<PreparedStatement> stmt);

private:
    std::string m_databasePath;
    bool m_isOpen;
    
    // Mock storage for in-memory simulation
    struct Table {
        std::vector<std::string> columns;
        std::vector<std::vector<std::string>> rows;
    };
    
    std::unordered_map<std::string, Table> m_tables;
    
    // Query parsing helpers
    bool parseCreateTable(const std::string& sql);
    bool parseInsert(const std::string& sql);
    std::vector<std::vector<std::string>> parseSelect(const std::string& sql);
    bool parseUpdate(const std::string& sql);
    bool parseDelete(const std::string& sql);
};

} // namespace database
} // namespace trkenv