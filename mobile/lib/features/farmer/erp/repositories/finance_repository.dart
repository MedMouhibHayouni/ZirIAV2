import 'package:dio/dio.dart';
import 'package:isar/isar.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../../core/network/api_client_provider.dart';
import '../../../../core/database/isar_provider.dart';

part 'finance_repository.g.dart';

// Modèles MOCK pour la démo Isar
@collection
class FinanceSummary {
  Id id = 1; // Un seul summary global
  late double totalRevenue;
  late double totalExpenses;
  late double balance;
  late DateTime lastUpdated;
}

@collection
class InventoryItem {
  Id id = Isar.autoIncrement;
  late String remoteId;
  late String name;
  late double quantity;
  late String unit;
}

class FinanceRepository {
  final Dio _dio;
  final Isar _isar;

  FinanceRepository(this._dio, this._isar);

  Future<void> syncFinanceData() async {
    try {
      // 1. Appels HTTP parallèles
      final results = await Future.wait([
        _dio.get('/finance/summary'),
        _dio.get('/inventory'),
      ]);

      final summaryData = results[0].data;
      final inventoryData = results[1].data as List;

      // 2. Traitement des données
      final summary = FinanceSummary()
        ..totalRevenue = (summaryData['revenue'] as num).toDouble()
        ..totalExpenses = (summaryData['expenses'] as num).toDouble()
        ..balance = (summaryData['balance'] as num).toDouble()
        ..lastUpdated = DateTime.now();

      final items = inventoryData
          .map((json) => InventoryItem()
            ..remoteId = json['id']
            ..name = json['name']
            ..quantity = (json['quantity'] as num).toDouble()
            ..unit = json['unit'])
          .toList();

      // 3. Mise à jour Isar (ERP de poche hors-ligne)
      await _isar.writeTxn(() async {
        await _isar.financeSummarys.put(summary);
        await _isar.inventoryItems.clear();
        await _isar.inventoryItems.putAll(items);
      });
    } catch (e) {
      // Offline ou erreur, on garde ce qu'il y a dans Isar
      print('Erreur de synchro finance: $e');
    }
  }

  // Méthodes locales (Offline)
  Future<FinanceSummary?> getLocalSummary() async {
    return await _isar.financeSummarys.get(1);
  }

  Future<List<InventoryItem>> getLocalInventory() async {
    return await _isar.inventoryItems.where().findAll();
  }
}

@riverpod
FinanceRepository financeRepository(FinanceRepositoryRef ref) {
  final dio = ref.watch(apiClientProvider);
  final isar = ref.watch(isarProvider);
  return FinanceRepository(dio, isar);
}
