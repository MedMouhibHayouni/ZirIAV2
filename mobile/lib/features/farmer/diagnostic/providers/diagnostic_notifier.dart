import 'package:flutter/material.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:dio/dio.dart';
import 'package:ziria_mobile/core/database/isar_provider.dart';
import 'package:ziria_mobile/core/database/models/sync_action.dart';
import 'package:ziria_mobile/core/database/models/cached_diagnostic.dart';
import 'package:ziria_mobile/core/network/api_client.dart';
import 'dart:convert';

part 'diagnostic_notifier.g.dart';

enum DiagnosticStatus { idle, capturing, analyzing, result, error }

class DiagnosticResult {
  final String diseaseNameFr;
  final String diseaseNameAr;
  final double severity; // 0.0 to 1.0
  final String severityLabel;
  final Color severityColor;
  final double confidence;
  final List<String> recommendations;
  final String imagePath;

  const DiagnosticResult({
    required this.diseaseNameFr,
    required this.diseaseNameAr,
    required this.severity,
    required this.severityLabel,
    required this.severityColor,
    required this.confidence,
    required this.recommendations,
    required this.imagePath,
  });
}

class DiagnosticState {
  final DiagnosticStatus status;
  final DiagnosticResult? result;
  final String? imagePath;
  final String? errorMessage;
  final bool expertRequestQueued;

  const DiagnosticState({
    this.status = DiagnosticStatus.idle,
    this.result,
    this.imagePath,
    this.errorMessage,
    this.expertRequestQueued = false,
  });

  DiagnosticState copyWith({
    DiagnosticStatus? status,
    DiagnosticResult? result,
    String? imagePath,
    String? errorMessage,
    bool? expertRequestQueued,
  }) =>
      DiagnosticState(
        status: status ?? this.status,
        result: result ?? this.result,
        imagePath: imagePath ?? this.imagePath,
        errorMessage: errorMessage ?? this.errorMessage,
        expertRequestQueued: expertRequestQueued ?? this.expertRequestQueued,
      );
}

@riverpod
class DiagnosticNotifier extends _$DiagnosticNotifier {
  @override
  DiagnosticState build() => const DiagnosticState();

  Future<void> analyzeImage(String imagePath, {String? parcelId}) async {
    state = state.copyWith(
        status: DiagnosticStatus.analyzing, imagePath: imagePath);

    try {
      final dio = ref.read(dioProvider);
      
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(imagePath),
        if (parcelId != null) 'parcel_id': parcelId,
        'lat': 0.0,
        'lng': 0.0,
      });

      final response = await dio.post('/ai/analyze-disease', data: formData);
      final data = response.data;
      
      final vision = data['vision'] ?? {};
      final decision = data['decision'] ?? {};
      
      final result = DiagnosticResult(
        diseaseNameFr: vision['disease'] ?? 'Inconnu',
        diseaseNameAr: decision['recommendation_darija'] ?? 'غير متوفر',
        severity: (vision['confidence'] ?? 0.72).toDouble(),
        severityLabel: decision['urgency'] ?? 'Modéré',
        severityColor: const Color(0xFFFF6E40),
        confidence: (vision['confidence'] ?? 0.91).toDouble(),
        recommendations: [decision['recommendation_fr'] ?? ''],
        imagePath: imagePath,
      );

      state = state.copyWith(
        status: DiagnosticStatus.result,
        result: result,
      );
      
      final isar = IsarDatabase.instance;
      await isar.writeTxn(() async {
        final cached = CachedDiagnostic()
          ..userId = 'current_user'
          ..parcelId = parcelId
          ..photoPath = imagePath
          ..localResultJson = jsonEncode(data)
          ..createdAt = DateTime.now()
          ..isSynced = true;
        await isar.cachedDiagnostics.put(cached);
      });

    } catch (e) {
      if (e is DioException && e.type != DioExceptionType.badResponse) {
        final isar = IsarDatabase.instance;
        await isar.writeTxn(() async {
          final action = SyncAction(
            endpoint: '/ai/analyze-disease',
            method: 'POST',
            payload: jsonEncode({'image_path': imagePath, 'parcel_id': parcelId, 'offline': true}),
            createdAt: DateTime.now(),
          );
          await isar.syncActions.put(action);
        });
        
        state = state.copyWith(
          status: DiagnosticStatus.error,
          errorMessage: 'Analyse locale indisponible. Requête enregistrée pour synchronisation ultérieure.',
        );
      } else {
        state = state.copyWith(
          status: DiagnosticStatus.error,
          errorMessage: e.toString(),
        );
      }
    }
  }

  void reset() => state = const DiagnosticState();

  Future<void> queueExpertRequest() async {
    try {
      final dio = ref.read(dioProvider);
      await dio.post('/expert/validations', data: {
        'image_path': state.imagePath,
        'disease': state.result?.diseaseNameFr,
      });
      state = state.copyWith(expertRequestQueued: true);
    } catch (e) {
      if (e is DioException && e.type != DioExceptionType.badResponse) {
        final isar = IsarDatabase.instance;
        await isar.writeTxn(() async {
          final action = SyncAction(
            endpoint: '/expert/validations',
            method: 'POST',
            payload: jsonEncode({
              'image_path': state.imagePath,
              'disease': state.result?.diseaseNameFr,
            }),
            createdAt: DateTime.now(),
          );
          await isar.syncActions.put(action);
        });
        state = state.copyWith(expertRequestQueued: true, errorMessage: 'Demande mise en file d\'attente (hors ligne).');
      } else {
         state = state.copyWith(errorMessage: 'Erreur lors de la demande: ${e.toString()}');
      }
    }
  }
}
