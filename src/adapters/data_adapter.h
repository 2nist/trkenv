#pragma once

#include <memory>
#include <vector>
#include <string>
#include <unordered_map>
#include <functional>

namespace trkenv {
namespace adapters {

/**
 * DataAdapter - Adapter for data processing and storage
 * Implements the ports/adapters pattern for data I/O
 */
class DataAdapter {
public:
    DataAdapter();
    virtual ~DataAdapter() = default;

    // Adapter lifecycle
    virtual bool initialize() = 0;
    virtual void shutdown() = 0;

    // Data operations
    virtual bool writeData(const std::string& key, const void* data, size_t size) = 0;
    virtual bool readData(const std::string& key, void* data, size_t& size) = 0;
    virtual bool deleteData(const std::string& key) = 0;
    virtual bool hasData(const std::string& key) const = 0;
    
    // Metadata
    virtual size_t getDataSize(const std::string& key) const = 0;
    virtual std::vector<std::string> listKeys() const = 0;
    
    // Status
    virtual bool isInitialized() const = 0;
    virtual std::string getAdapterName() const = 0;

protected:
    bool m_initialized;
};

/**
 * SQLiteDataAdapter - SQLite-based data adapter implementation
 */
class SQLiteDataAdapter : public DataAdapter {
public:
    SQLiteDataAdapter(const std::string& databasePath = ":memory:");
    ~SQLiteDataAdapter() override;

    // DataAdapter interface
    bool initialize() override;
    void shutdown() override;
    bool writeData(const std::string& key, const void* data, size_t size) override;
    bool readData(const std::string& key, void* data, size_t& size) override;
    bool deleteData(const std::string& key) override;
    bool hasData(const std::string& key) const override;
    size_t getDataSize(const std::string& key) const override;
    std::vector<std::string> listKeys() const override;
    bool isInitialized() const override;
    std::string getAdapterName() const override;

private:
    std::string m_databasePath;
    void* m_database; // SQLite database handle (void* to avoid SQLite dependency in header)
    
    bool createTables();
};

/**
 * MemoryDataAdapter - In-memory data adapter for testing
 */
class MemoryDataAdapter : public DataAdapter {
public:
    MemoryDataAdapter();
    ~MemoryDataAdapter() override = default;

    // DataAdapter interface
    bool initialize() override;
    void shutdown() override;
    bool writeData(const std::string& key, const void* data, size_t size) override;
    bool readData(const std::string& key, void* data, size_t& size) override;
    bool deleteData(const std::string& key) override;
    bool hasData(const std::string& key) const override;
    size_t getDataSize(const std::string& key) const override;
    std::vector<std::string> listKeys() const override;
    bool isInitialized() const override;
    std::string getAdapterName() const override;

private:
    std::unordered_map<std::string, std::vector<uint8_t>> m_data;
};

/**
 * FileDataAdapter - File system based data adapter
 */
class FileDataAdapter : public DataAdapter {
public:
    FileDataAdapter(const std::string& basePath = "./data");
    ~FileDataAdapter() override = default;

    // DataAdapter interface
    bool initialize() override;
    void shutdown() override;
    bool writeData(const std::string& key, const void* data, size_t size) override;
    bool readData(const std::string& key, void* data, size_t& size) override;
    bool deleteData(const std::string& key) override;
    bool hasData(const std::string& key) const override;
    size_t getDataSize(const std::string& key) const override;
    std::vector<std::string> listKeys() const override;
    bool isInitialized() const override;
    std::string getAdapterName() const override;

private:
    std::string m_basePath;
    std::string getFilePath(const std::string& key) const;
};

} // namespace adapters
} // namespace trkenv