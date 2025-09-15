#include "data_adapter.h"
#include <iostream>
#include <fstream>
#include <filesystem>
#include <cstring>

namespace trkenv {
namespace adapters {

// DataAdapter base implementation
DataAdapter::DataAdapter() : m_initialized(false) {
}

// SQLiteDataAdapter implementation
SQLiteDataAdapter::SQLiteDataAdapter(const std::string& databasePath)
    : m_databasePath(databasePath), m_database(nullptr) {
}

SQLiteDataAdapter::~SQLiteDataAdapter() {
    if (m_initialized) {
        shutdown();
    }
}

bool SQLiteDataAdapter::initialize() {
    if (m_initialized) {
        return true;
    }

    // TODO: Initialize SQLite database
    // For now, this is a stub implementation
    std::cout << "Initializing SQLite Data Adapter with database: " << m_databasePath << std::endl;
    
    // In a real implementation, we would:
    // 1. Open SQLite database connection
    // 2. Create necessary tables
    // 3. Set up prepared statements
    
    m_initialized = createTables();
    return m_initialized;
}

void SQLiteDataAdapter::shutdown() {
    if (!m_initialized) {
        return;
    }

    // TODO: Close SQLite database connection
    std::cout << "Shutting down SQLite Data Adapter" << std::endl;
    
    m_database = nullptr;
    m_initialized = false;
}

bool SQLiteDataAdapter::writeData(const std::string& key, const void* data, size_t size) {
    if (!m_initialized || !data || size == 0) {
        return false;
    }

    // TODO: Implement SQLite INSERT/UPDATE
    std::cout << "SQLite: Writing " << size << " bytes for key: " << key << std::endl;
    return true; // Stub
}

bool SQLiteDataAdapter::readData(const std::string& key, void* data, size_t& size) {
    if (!m_initialized || !data) {
        return false;
    }

    // TODO: Implement SQLite SELECT
    std::cout << "SQLite: Reading data for key: " << key << std::endl;
    size = 0; // Stub
    return false; // No data found (stub)
}

bool SQLiteDataAdapter::deleteData(const std::string& key) {
    if (!m_initialized) {
        return false;
    }

    // TODO: Implement SQLite DELETE
    std::cout << "SQLite: Deleting data for key: " << key << std::endl;
    return true; // Stub
}

bool SQLiteDataAdapter::hasData(const std::string& key) const {
    if (!m_initialized) {
        return false;
    }

    // TODO: Implement SQLite EXISTS check
    return false; // Stub
}

size_t SQLiteDataAdapter::getDataSize(const std::string& key) const {
    if (!m_initialized) {
        return 0;
    }

    // TODO: Implement SQLite size query
    return 0; // Stub
}

std::vector<std::string> SQLiteDataAdapter::listKeys() const {
    if (!m_initialized) {
        return {};
    }

    // TODO: Implement SQLite key listing
    return {}; // Stub
}

bool SQLiteDataAdapter::isInitialized() const {
    return m_initialized;
}

std::string SQLiteDataAdapter::getAdapterName() const {
    return "SQLite Data Adapter";
}

bool SQLiteDataAdapter::createTables() {
    // TODO: Create SQLite tables
    // For now, just return true as stub
    std::cout << "Creating SQLite tables (stub)" << std::endl;
    return true;
}

// MemoryDataAdapter implementation
MemoryDataAdapter::MemoryDataAdapter() {
}

bool MemoryDataAdapter::initialize() {
    m_initialized = true;
    std::cout << "Memory Data Adapter initialized" << std::endl;
    return true;
}

void MemoryDataAdapter::shutdown() {
    m_data.clear();
    m_initialized = false;
    std::cout << "Memory Data Adapter shutdown" << std::endl;
}

bool MemoryDataAdapter::writeData(const std::string& key, const void* data, size_t size) {
    if (!m_initialized || !data || size == 0) {
        return false;
    }

    std::vector<uint8_t> buffer(size);
    std::memcpy(buffer.data(), data, size);
    m_data[key] = std::move(buffer);
    
    return true;
}

bool MemoryDataAdapter::readData(const std::string& key, void* data, size_t& size) {
    if (!m_initialized || !data) {
        return false;
    }

    auto it = m_data.find(key);
    if (it != m_data.end()) {
        size_t copySize = std::min(size, it->second.size());
        std::memcpy(data, it->second.data(), copySize);
        size = copySize;
        return true;
    }
    
    size = 0;
    return false;
}

bool MemoryDataAdapter::deleteData(const std::string& key) {
    if (!m_initialized) {
        return false;
    }

    auto it = m_data.find(key);
    if (it != m_data.end()) {
        m_data.erase(it);
        return true;
    }
    
    return false;
}

bool MemoryDataAdapter::hasData(const std::string& key) const {
    return m_initialized && m_data.find(key) != m_data.end();
}

size_t MemoryDataAdapter::getDataSize(const std::string& key) const {
    if (!m_initialized) {
        return 0;
    }

    auto it = m_data.find(key);
    return (it != m_data.end()) ? it->second.size() : 0;
}

std::vector<std::string> MemoryDataAdapter::listKeys() const {
    std::vector<std::string> keys;
    if (m_initialized) {
        for (const auto& [key, data] : m_data) {
            keys.push_back(key);
        }
    }
    return keys;
}

bool MemoryDataAdapter::isInitialized() const {
    return m_initialized;
}

std::string MemoryDataAdapter::getAdapterName() const {
    return "Memory Data Adapter";
}

// FileDataAdapter implementation
FileDataAdapter::FileDataAdapter(const std::string& basePath)
    : m_basePath(basePath) {
}

bool FileDataAdapter::initialize() {
    if (m_initialized) {
        return true;
    }

    try {
        std::filesystem::create_directories(m_basePath);
        m_initialized = true;
        std::cout << "File Data Adapter initialized with base path: " << m_basePath << std::endl;
        return true;
    } catch (const std::exception& e) {
        std::cerr << "Failed to initialize File Data Adapter: " << e.what() << std::endl;
        return false;
    }
}

void FileDataAdapter::shutdown() {
    m_initialized = false;
    std::cout << "File Data Adapter shutdown" << std::endl;
}

bool FileDataAdapter::writeData(const std::string& key, const void* data, size_t size) {
    if (!m_initialized || !data || size == 0) {
        return false;
    }

    try {
        std::ofstream file(getFilePath(key), std::ios::binary);
        if (file.is_open()) {
            file.write(static_cast<const char*>(data), size);
            return file.good();
        }
    } catch (const std::exception& e) {
        std::cerr << "Error writing file data: " << e.what() << std::endl;
    }
    
    return false;
}

bool FileDataAdapter::readData(const std::string& key, void* data, size_t& size) {
    if (!m_initialized || !data) {
        return false;
    }

    try {
        std::ifstream file(getFilePath(key), std::ios::binary);
        if (file.is_open()) {
            file.seekg(0, std::ios::end);
            size_t fileSize = file.tellg();
            file.seekg(0, std::ios::beg);
            
            size_t readSize = std::min(size, fileSize);
            file.read(static_cast<char*>(data), readSize);
            size = readSize;
            
            return file.good();
        }
    } catch (const std::exception& e) {
        std::cerr << "Error reading file data: " << e.what() << std::endl;
    }
    
    size = 0;
    return false;
}

bool FileDataAdapter::deleteData(const std::string& key) {
    if (!m_initialized) {
        return false;
    }

    try {
        return std::filesystem::remove(getFilePath(key));
    } catch (const std::exception& e) {
        std::cerr << "Error deleting file data: " << e.what() << std::endl;
        return false;
    }
}

bool FileDataAdapter::hasData(const std::string& key) const {
    if (!m_initialized) {
        return false;
    }

    return std::filesystem::exists(getFilePath(key));
}

size_t FileDataAdapter::getDataSize(const std::string& key) const {
    if (!m_initialized) {
        return 0;
    }

    try {
        if (std::filesystem::exists(getFilePath(key))) {
            return std::filesystem::file_size(getFilePath(key));
        }
    } catch (const std::exception& e) {
        std::cerr << "Error getting file size: " << e.what() << std::endl;
    }
    
    return 0;
}

std::vector<std::string> FileDataAdapter::listKeys() const {
    std::vector<std::string> keys;
    
    if (!m_initialized) {
        return keys;
    }

    try {
        for (const auto& entry : std::filesystem::directory_iterator(m_basePath)) {
            if (entry.is_regular_file()) {
                keys.push_back(entry.path().filename().string());
            }
        }
    } catch (const std::exception& e) {
        std::cerr << "Error listing keys: " << e.what() << std::endl;
    }
    
    return keys;
}

bool FileDataAdapter::isInitialized() const {
    return m_initialized;
}

std::string FileDataAdapter::getAdapterName() const {
    return "File Data Adapter";
}

std::string FileDataAdapter::getFilePath(const std::string& key) const {
    return m_basePath + "/" + key;
}

} // namespace adapters
} // namespace trkenv