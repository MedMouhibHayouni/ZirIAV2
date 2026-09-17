import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'ml_kit_service.g.dart';

// Stub class for Windows build stability
class MLKitService {
  bool _isInitialized = false;

  Future<void> initialize() async {
    _isInitialized = true;
  }

  Future<List<Map<String, dynamic>>> analyzeImage(String imagePath) async {
    await initialize();
    
    // Return dummy data for stub
    return [
      {'disease': 'Olive Leaf Spot', 'confidence': 0.85}
    ];
  }

  void dispose() {
    // Stubbed
  }
}

@riverpod
MLKitService mlKitService(MlKitServiceRef ref) {
  final service = MLKitService();
  ref.onDispose(() => service.dispose());
  return service;
}
