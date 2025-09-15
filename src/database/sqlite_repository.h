#pragma once

#include <memory>
#include <string>
#include <vector>
#include <unordered_map>

namespace trkenv {
namespace database {

/**
 * DatabaseRepository - Repository pattern interface for data persistence
 */
template<typename T>
class DatabaseRepository {
public:
    virtual ~DatabaseRepository() = default;

    // CRUD operations
    virtual bool create(const std::string& id, const T& entity) = 0;
    virtual std::unique_ptr<T> read(const std::string& id) = 0;
    virtual bool update(const std::string& id, const T& entity) = 0;
    virtual bool remove(const std::string& id) = 0;
    
    // Query operations
    virtual std::vector<std::unique_ptr<T>> findAll() = 0;
    virtual std::vector<std::unique_ptr<T>> findByQuery(const std::string& query) = 0;
    virtual bool exists(const std::string& id) = 0;
    
    // Repository metadata
    virtual std::string getTableName() const = 0;
};

/**
 * SQLiteRepository - SQLite-based repository implementation
 */
template<typename T>
class SQLiteRepository : public DatabaseRepository<T> {
public:
    SQLiteRepository(const std::string& databasePath, const std::string& tableName);
    ~SQLiteRepository() override;

    // Initialize the repository
    bool initialize();
    void shutdown();

    // DatabaseRepository interface
    bool create(const std::string& id, const T& entity) override;
    std::unique_ptr<T> read(const std::string& id) override;
    bool update(const std::string& id, const T& entity) override;
    bool remove(const std::string& id) override;
    std::vector<std::unique_ptr<T>> findAll() override;
    std::vector<std::unique_ptr<T>> findByQuery(const std::string& query) override;
    bool exists(const std::string& id) override;
    std::string getTableName() const override;

protected:
    std::string m_databasePath;
    std::string m_tableName;
    void* m_database; // SQLite database handle
    bool m_initialized;
    
    // Serialization helpers (to be specialized for each type)
    virtual std::string serialize(const T& entity) = 0;
    virtual std::unique_ptr<T> deserialize(const std::string& data) = 0;
    
    // Schema management
    virtual bool createTable() = 0;
};

/**
 * MemoryRepository - In-memory repository for testing
 */
template<typename T>
class MemoryRepository : public DatabaseRepository<T> {
public:
    MemoryRepository(const std::string& tableName);
    ~MemoryRepository() override = default;

    // DatabaseRepository interface
    bool create(const std::string& id, const T& entity) override;
    std::unique_ptr<T> read(const std::string& id) override;
    bool update(const std::string& id, const T& entity) override;
    bool remove(const std::string& id) override;
    std::vector<std::unique_ptr<T>> findAll() override;
    std::vector<std::unique_ptr<T>> findByQuery(const std::string& query) override;
    bool exists(const std::string& id) override;
    std::string getTableName() const override;

private:
    std::string m_tableName;
    std::unordered_map<std::string, std::unique_ptr<T>> m_data;
};

// Template implementations for MemoryRepository
template<typename T>
MemoryRepository<T>::MemoryRepository(const std::string& tableName)
    : m_tableName(tableName) {
}

template<typename T>
bool MemoryRepository<T>::create(const std::string& id, const T& entity) {
    if (exists(id)) {
        return false; // Already exists
    }
    
    m_data[id] = std::make_unique<T>(entity);
    return true;
}

template<typename T>
std::unique_ptr<T> MemoryRepository<T>::read(const std::string& id) {
    auto it = m_data.find(id);
    if (it != m_data.end()) {
        return std::make_unique<T>(*it->second);
    }
    return nullptr;
}

template<typename T>
bool MemoryRepository<T>::update(const std::string& id, const T& entity) {
    auto it = m_data.find(id);
    if (it != m_data.end()) {
        *it->second = entity;
        return true;
    }
    return false;
}

template<typename T>
bool MemoryRepository<T>::remove(const std::string& id) {
    auto it = m_data.find(id);
    if (it != m_data.end()) {
        m_data.erase(it);
        return true;
    }
    return false;
}

template<typename T>
std::vector<std::unique_ptr<T>> MemoryRepository<T>::findAll() {
    std::vector<std::unique_ptr<T>> result;
    for (const auto& [id, entity] : m_data) {
        result.push_back(std::make_unique<T>(*entity));
    }
    return result;
}

template<typename T>
std::vector<std::unique_ptr<T>> MemoryRepository<T>::findByQuery(const std::string& query) {
    // Simple implementation - return all for now
    // In a real implementation, this would parse and execute the query
    return findAll();
}

template<typename T>
bool MemoryRepository<T>::exists(const std::string& id) {
    return m_data.find(id) != m_data.end();
}

template<typename T>
std::string MemoryRepository<T>::getTableName() const {
    return m_tableName;
}

} // namespace database
} // namespace trkenv