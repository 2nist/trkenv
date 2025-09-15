cmake_minimum_required(VERSION 3.20)
project(trk_desktop_stub)

add_executable(trk_desktop_stub
  Source/Main.cpp
)

target_compile_features(trk_desktop_stub PRIVATE cxx_std_17)
