cmake_minimum_required(VERSION 3.20)
project(trk_desktop LANGUAGES CXX)

include(FetchContent)

# Fetch JUCE (header-only modules). Choose a stable tag.
FetchContent_Declare(
  JUCE
  GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
  GIT_TAG 7.0.12
)
FetchContent_MakeAvailable(JUCE)

add_executable(trk_desktop WIN32
  Source/Main.cpp
)

target_compile_features(trk_desktop PRIVATE cxx_std_17)
target_compile_definitions(trk_desktop PRIVATE
  JUCE_WEB_BROWSER=1        # enable WebBrowserComponent
  JUCE_DISABLE_AUDIO_SUPPORT=1
  JUCE_USE_WIN_WEBVIEW2=1   # prefer Edge WebView2 when available
)

target_link_libraries(trk_desktop PRIVATE
  juce::juce_gui_extra
  juce::juce_gui_basics
  juce::juce_graphics
  juce::juce_core
)

# On Windows, set subsystem to windows to hide console
if (MSVC)
  target_link_options(trk_desktop PRIVATE /SUBSYSTEM:WINDOWS)
endif()
