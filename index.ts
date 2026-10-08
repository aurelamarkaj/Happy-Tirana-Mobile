// Headless location tasks must be registered before Router mounts any screen.
import './src/gps/task';
import './src/push/setup';
import 'expo-router/entry';
