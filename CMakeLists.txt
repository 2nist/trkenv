cmake_minimum_required(VERSION 3.15)
project(trkenv VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# JUCE Framework
find_package(PkgConfig REQUIRED)

# Include directories
include_directories(
    src/core
    src/plugins
    src/adapters
    src/flow
    src/database
)

# Core library
add_library(trkenv_core
    src/core/microkernel.cpp
    src/core/plugin_host.cpp
    src/core/plugin_registry.cpp
    src/plugins/plugin_interface.cpp
    src/adapters/audio_adapter.cpp
    src/adapters/data_adapter.cpp
    src/flow/dag_processor.cpp
    src/flow/flow_node.cpp
    src/flow/execution_engine.cpp
    src/database/sqlite_repository.cpp
    src/database/database_stubs.cpp
)

# Main executable
add_executable(trkenv
    src/main.cpp
)

target_link_libraries(trkenv trkenv_core)

# Test executables
add_executable(test_microkernel
    tests/test_microkernel.cpp
)

add_executable(test_plugin_host
    tests/test_plugin_host.cpp
)

add_executable(test_dag_processor
    tests/test_dag_processor.cpp
)

add_executable(test_flow_engine
    tests/test_flow_engine.cpp
)

target_link_libraries(test_microkernel trkenv_core)
target_link_libraries(test_plugin_host trkenv_core)
target_link_libraries(test_dag_processor trkenv_core)
target_link_libraries(test_flow_engine trkenv_core)

# Enable testing
enable_testing()
add_test(NAME microkernel_tests COMMAND test_microkernel)
add_test(NAME plugin_host_tests COMMAND test_plugin_host)
add_test(NAME dag_processor_tests COMMAND test_dag_processor)
add_test(NAME flow_engine_tests COMMAND test_flow_engine)