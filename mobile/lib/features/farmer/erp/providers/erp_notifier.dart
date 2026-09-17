import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:ziria_mobile/core/database/isar_provider.dart';
import 'package:ziria_mobile/core/database/models/cached_stock.dart';
import 'package:ziria_mobile/core/network/api_client.dart';
import 'package:isar/isar.dart';

part 'erp_notifier.g.dart';

class StockItem {
  final String id;
  final String name;
  final double quantity;
  final String unit;
  final double lowStockThreshold;
  final String emoji;

  bool get isLow => quantity <= lowStockThreshold;

  const StockItem({
    required this.id,
    required this.name,
    required this.quantity,
    required this.unit,
    required this.lowStockThreshold,
    required this.emoji,
  });
}

class FinanceSummary {
  final double revenue;
  final double expenses;
  final String monthLabel;

  double get balance => revenue - expenses;

  const FinanceSummary(
      {required this.revenue,
      required this.expenses,
      required this.monthLabel});
}

class ErpState {
  final List<StockItem> productionStock;
  final List<StockItem> inputsStock;
  final FinanceSummary financeSummary;
  final bool isLoading;
  final bool isExporting;

  const ErpState({
    this.productionStock = const [],
    this.inputsStock = const [],
    this.financeSummary =
        const FinanceSummary(revenue: 0, expenses: 0, monthLabel: ''),
    this.isLoading = false,
    this.isExporting = false,
  });

  ErpState copyWith({
    List<StockItem>? productionStock,
    List<StockItem>? inputsStock,
    FinanceSummary? financeSummary,
    bool? isLoading,
    bool? isExporting,
  }) =>
      ErpState(
        productionStock: productionStock ?? this.productionStock,
        inputsStock: inputsStock ?? this.inputsStock,
        financeSummary: financeSummary ?? this.financeSummary,
        isLoading: isLoading ?? this.isLoading,
        isExporting: isExporting ?? this.isExporting,
      );
}

@riverpod
class ErpNotifier extends _$ErpNotifier {
  @override
  ErpState build() {
    _loadData();
    return const ErpState(isLoading: true);
  }

  Future<void> _loadData() async {
    final dio = ref.read(dioProvider);
    final isar = IsarDatabase.instance;

    try {
      // Fetch online data
      final stockRes = await dio.get('/inventory/my');
      final financeRes = await dio.get('/finance/records/summary');

      final stockData = stockRes.data as List;
      final financeDataList = financeRes.data as List;

      // Update Isar cache
      await isar.writeTxn(() async {
        await isar.cachedStocks.clear();
        for (var item in stockData) {
          final cached = CachedStock()
            ..ownerId = 'current_user' // Replace with actual user ID
            ..cropType = item['crop_type'] ?? 'Inconnu'
            ..quantityKg = (item['quantity_tonnes'] ?? 0).toDouble() * 1000
            ..unit = 'kg'
            ..updatedAt = DateTime.now();
          await isar.cachedStocks.put(cached);
        }
      });

      // Map to models
      final production = <StockItem>[];
      final inputs = <StockItem>[];

      for (var item in stockData) {
        final stockItem = StockItem(
          id: item['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
          name: item['crop_type'] ?? 'Inconnu',
          quantity: (item['quantity_tonnes'] ?? 0).toDouble(),
          unit: 'tonnes',
          lowStockThreshold: 0.5,
          emoji: '📦',
        );
        production.add(stockItem);
      }

      state = state.copyWith(
        isLoading: false,
        productionStock: production,
        inputsStock: inputs,
        financeSummary: FinanceSummary(
          revenue: financeDataList.isNotEmpty ? (financeDataList.first['total_income'] ?? 0).toDouble() : 0.0,
          expenses: financeDataList.isNotEmpty ? (financeDataList.first['total_expenses'] ?? 0).toDouble() : 0.0,
          monthLabel: financeDataList.isNotEmpty ? financeDataList.first['month'] ?? 'Mois en cours' : 'Mois en cours',
        ),
      );
    } catch (e) {
      // Fallback to local data
      final cachedStocks = await isar.cachedStocks.where().findAll();
      
      if (cachedStocks.isEmpty) {
        state = state.copyWith(isLoading: false, errorMessage: 'Hors ligne et aucun cache disponible.');
        return;
      }

      final production = cachedStocks.map((c) => StockItem(
        id: c.id.toString(),
        name: c.cropType,
        quantity: c.quantityKg,
        unit: c.unit,
        lowStockThreshold: 5,
        emoji: '📦',
      )).toList();

      state = state.copyWith(
        isLoading: false,
        productionStock: production,
        inputsStock: [], // Assuming inputs aren't cached separately yet
      );
    }
  }


  Future<void> exportPdf() async {
    state = state.copyWith(isExporting: true);
    // In production: use pdf package to generate PDF then share via share_plus
    await Future.delayed(const Duration(milliseconds: 1800));
    state = state.copyWith(isExporting: false);
  }
}
