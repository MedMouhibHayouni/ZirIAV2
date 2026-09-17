import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'package:printing/printing.dart';
import 'package:pdf/widgets.dart' as pw;
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import '../../../../core/widgets/skeleton_widget.dart';
import '../../../../core/widgets/state_widgets.dart';
import 'package:dio/dio.dart';

// ── Models ────────────────────────────────────────────────────────────────────
class InventoryItem {
  final String id, name, category, unit;
  final double quantity;
  InventoryItem({required this.id, required this.name, required this.category, required this.unit, required this.quantity});
  factory InventoryItem.fromJson(Map j) => InventoryItem(
        id: j['id']?.toString() ?? '',
        name: j['product_name']?.toString() ?? j['name']?.toString() ?? '',
        category: j['category']?.toString() ?? 'PRODUCTION',
        unit: j['unit']?.toString() ?? 'kg',
        quantity: double.tryParse(j['quantity']?.toString() ?? '0') ?? 0.0,
      );
}

class FinanceSummary {
  final double revenue, expenses, balance;
  final List<Map<String, dynamic>> weeklyData;
  FinanceSummary({required this.revenue, required this.expenses, required this.balance, this.weeklyData = const []});
  factory FinanceSummary.fromJson(Map j) => FinanceSummary(
        revenue: double.tryParse((j['total_revenue'] ?? j['revenue'])?.toString() ?? '0') ?? 0.0,
        expenses: double.tryParse((j['total_expenses'] ?? j['expenses'])?.toString() ?? '0') ?? 0.0,
        balance: double.tryParse((j['balance'] ?? j['net'])?.toString() ?? '0') ?? 0.0,
        weeklyData: List<Map<String, dynamic>>.from(j['weekly'] ?? []),
      );
}

class FinanceRecord {
  final String id, description, category;
  final double amount;
  final DateTime date;
  FinanceRecord({required this.id, required this.description, required this.category, required this.amount, required this.date});
  factory FinanceRecord.fromJson(Map j) => FinanceRecord(
        id: j['id']?.toString() ?? '',
        description: j['description']?.toString() ?? '',
        category: j['category']?.toString() ?? 'OTHER',
        amount: double.tryParse(j['amount']?.toString() ?? '0') ?? 0.0,
        date: DateTime.tryParse(j['created_at']?.toString() ?? '') ?? DateTime.now(),
      );
}

// ── Providers ─────────────────────────────────────────────────────────────────
final inventoryProvider = FutureProvider<List<InventoryItem>>((ref) async {
  try {
    final res = await ref.watch(dioProvider).get('/inventory/my');
    final list = res.data is List ? res.data as List : (res.data['items'] ?? []);
    return list.map<InventoryItem>((e) => InventoryItem.fromJson(e)).toList();
  } catch(e) {
    return [];
  }
});

final financeSummaryProvider = FutureProvider.family<FinanceSummary, String>((ref, period) async {
  try {
    final res = await ref.watch(dioProvider).get('/finance/records/summary', queryParameters: {'period': period});
    return FinanceSummary.fromJson(res.data);
  } catch(e) {
    return FinanceSummary(revenue: 0, expenses: 0, balance: 0);
  }
});

final financeRecordsProvider = FutureProvider<List<FinanceRecord>>((ref) async {
  try {
    final res = await ref.watch(dioProvider).get('/finance/records/me', queryParameters: {'page': 1, 'limit': 20});
    final list = res.data is List ? res.data as List : (res.data['items'] ?? []);
    return list.map<FinanceRecord>((e) => FinanceRecord.fromJson(e)).toList();
  } catch(e) {
    return [];
  }
});

// Real providers for new tabs matching Web UI
final dashboardStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  try {
    final dio = ref.watch(dioProvider);
    final stockRes = await dio.get('/inventory/stats');
    final marketRes = await dio.get('/marketplace/my-stats');
    return {
      'stockValue': stockRes.data['estimated_value_tnd'] ?? 0,
      'activeListings': marketRes.data['active_listings_count'] ?? 0,
      'pendingWorkers': marketRes.data['pending_connections'] ?? 0,
    };
  } catch (e) {
    return {'stockValue': 0, 'activeListings': 0, 'pendingWorkers': 0};
  }
});

final labourOffersProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  try {
    final res = await ref.watch(dioProvider).get('/workers/job-offers/mine');
    final list = res.data is List ? res.data as List : (res.data['items'] ?? []);
    return List<Map<String, dynamic>>.from(list);
  } catch (e) {
    return [];
  }
});

final subscriptionPlansProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  try {
    final res = await ref.watch(dioProvider).get('/subscriptions/plans');
    return List<Map<String, dynamic>>.from(res.data);
  } catch (e) {
    return [];
  }
});

final mySubscriptionProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  try {
    final res = await ref.watch(dioProvider).get('/subscriptions/my');
    return res.data;
  } catch (e) {
    return null;
  }
});

// ── ERP Screen ────────────────────────────────────────────────────────────────
class ErpScreen extends ConsumerStatefulWidget {
  const ErpScreen({super.key});
  @override
  ConsumerState<ErpScreen> createState() => _ErpScreenState();
}

class _ErpScreenState extends ConsumerState<ErpScreen> with SingleTickerProviderStateMixin {
  late TabController _tab;
  String _period = 'month';
  final _fmt = NumberFormat('#,##0.00', 'fr_FR');

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 5, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      children: [
        ZirGlassCard(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          padding: EdgeInsets.zero,
          child: TabBar(
            controller: _tab,
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            labelColor: ZiriaColors.accentEmerald,
            unselectedLabelColor: isDark ? Colors.white38 : Colors.black38,
            indicatorColor: ZiriaColors.accentEmerald,
            indicatorSize: TabBarIndicatorSize.label,
            dividerColor: Colors.transparent,
            tabs: const [
              Tab(text: 'Vue d\'ensemble'),
              Tab(text: 'Inventaire'),
              Tab(text: 'Finances'),
              Tab(text: 'Main d\'œuvre'),
              Tab(text: 'Abonnement')
            ],
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tab,
            children: [
              _buildDashboard(isDark),
              _buildStock(isDark),
              _buildFinances(isDark),
              _buildLabour(isDark),
              _buildSubscription(isDark),
            ],
          ),
        ),
      ],
    );
  }

  // ── Tab 1: Dashboard ──
  Widget _buildDashboard(bool isDark) {
    final statsAsync = ref.watch(dashboardStatsProvider);
    final financeAsync = ref.watch(financeSummaryProvider('month'));

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(dashboardStatsProvider);
        ref.invalidate(financeSummaryProvider);
      },
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _sectionHeader('APERÇU DU MOIS', Icons.dashboard_rounded),
            const SizedBox(height: 16),
            statsAsync.when(
              loading: () => const SkeletonCard(height: 120),
              error: (_, __) => const SizedBox.shrink(),
              data: (stats) => financeAsync.when(
                loading: () => const SkeletonCard(height: 120),
                error: (_, __) => const SizedBox.shrink(),
                data: (finance) => Column(
                  children: [
                    Row(
                      children: [
                        _kpiCard('REVENUS NETS', finance.balance, ZiriaColors.accentEmerald),
                        const SizedBox(width: 12),
                        _kpiCard('VALEUR STOCK', stats['stockValue'].toDouble(), const Color(0xFF60A5FA)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _kpiCard('ANNONCES', stats['activeListings'].toDouble(), const Color(0xFFFBBF24), suffix: ' Actives', hideCurrency: true),
                        const SizedBox(width: 12),
                        _kpiCard('OUVRIERS', stats['pendingWorkers'].toDouble(), const Color(0xFFA78BFA), suffix: ' En attente', hideCurrency: true),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
            _sectionHeader('ACTIONS RAPIDES', Icons.flash_on_rounded),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: _quickActionBtn(Icons.add_shopping_cart_rounded, 'Nouvelle Vente', () {
                  _tab.animateTo(2);
                  _openAddTransactionModal();
                })),
                const SizedBox(width: 12),
                Expanded(child: _quickActionBtn(Icons.person_add_rounded, 'Recruter', () {
                  _tab.animateTo(3);
                  _openJobModal();
                })),
              ],
            )
          ],
        ),
      ),
    );
  }

  Widget _quickActionBtn(IconData icon, String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: ZirGlassCard(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Column(
          children: [
            Icon(icon, color: ZiriaColors.accentEmerald, size: 28),
            const SizedBox(height: 8),
            Text(label, style: ZiriaText.bodySmall(color: Theme.of(context).brightness == Brightness.dark ? Colors.white70 : ZiriaColors.nightBlue), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  // ── Tab 2: Stock ──
  Widget _buildStock(bool isDark) {
    return ref.watch(inventoryProvider).when(
          loading: () => ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: 4,
              itemBuilder: (_, __) => const SkeletonCard(height: 90)),
          error: (_, __) => ErrorState(onRetry: () => ref.invalidate(inventoryProvider)),
          data: (items) {
            final production = items.where((i) => i.category == 'PRODUCTION').toList();
            final inputs = items.where((i) => i.category != 'PRODUCTION').toList();
            return ListView(
              padding: const EdgeInsets.all(16), 
              children: [
                if (production.isNotEmpty) ...[
                  _sectionHeader('MA PRODUCTION', Icons.eco_rounded),
                  const SizedBox(height: 12),
                  ...production.map((item) => _stockCard(item, isDark)),
                ],
                if (inputs.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  _sectionHeader('MES INTRANTS', Icons.inventory_2_rounded),
                  const SizedBox(height: 12),
                  ...inputs.map((item) => _stockCard(item, isDark)),
                ],
                if (items.isEmpty)
                  const EmptyState(title: 'Stock vide', emoji: '📦', subtitle: 'Ajoutez votre premier mouvement'),
                const SizedBox(height: 80),
              ]
            );
          },
        );
  }

  Widget _sectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 14, color: ZiriaColors.accentEmerald),
        const SizedBox(width: 8),
        Text(title, style: ZiriaText.label(color: Theme.of(context).brightness == Brightness.dark ? Colors.white38 : Colors.black54, letterSpacing: 1.2)),
      ],
    );
  }

  Widget _stockCard(InventoryItem item, bool isDark) => ZirGlassCard(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          Container(
            width: 48, height: 48,
            decoration: BoxDecoration(
              color: ZiriaColors.accentEmerald.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.inventory_2_outlined, color: ZiriaColors.accentEmerald, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.name, style: ZiriaText.headingSmall(color: isDark ? Colors.white : ZiriaColors.nightBlue)),
                const SizedBox(height: 4),
                Text('${_fmt.format(item.quantity)} ${item.unit}', style: ZiriaText.headingMedium(color: ZiriaColors.accentEmerald)),
              ]
            )
          ),
          Column(children: [
            _ActionBtn(icon: Icons.add_rounded, color: ZiriaColors.accentEmerald, onTap: () => _declareMovement(item, 'IN')),
            const SizedBox(height: 4),
            _ActionBtn(icon: Icons.remove_rounded, color: ZiriaColors.errorRed, onTap: () => _declareMovement(item, 'OUT')),
          ]),
        ]),
      );

  Future<void> _declareMovement(InventoryItem item, String type) async {
    final ctrl = TextEditingController();
    final ok = await showGeneralDialog<bool>(
      context: context,
      barrierDismissible: true,
      barrierLabel: '',
      pageBuilder: (ctx, anim1, anim2) => Center(
        child: ZirGlassCard(
          width: 320,
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('${type == 'IN' ? 'Entrée' : 'Sortie'} Stock', style: ZiriaText.headingMedium(color: Theme.of(context).brightness == Brightness.dark ? Colors.white : ZiriaColors.nightBlue)),
              const SizedBox(height: 8),
              Text(item.name, style: ZiriaText.bodySmall(color: Theme.of(context).brightness == Brightness.dark ? Colors.white38 : Colors.black54)),
              const SizedBox(height: 24),
              TextField(
                controller: ctrl,
                keyboardType: TextInputType.number,
                style: TextStyle(color: Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black),
                decoration: InputDecoration(
                  labelText: 'Quantité (${item.unit})',
                  labelStyle: TextStyle(color: Theme.of(context).brightness == Brightness.dark ? Colors.white70 : Colors.black54),
                  filled: true,
                  fillColor: Theme.of(context).brightness == Brightness.dark ? Colors.white10 : Colors.black.withOpacity(0.05),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(child: TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text('Annuler', style: TextStyle(color: Theme.of(context).brightness == Brightness.dark ? Colors.white54 : Colors.black54)))),
                  const SizedBox(width: 12),
                  Expanded(child: ZirGradientButton(label: 'Confirmer', height: 44, onPressed: () => Navigator.pop(ctx, true))),
                ],
              )
            ],
          ),
        ),
      ),
    );
    if (ok == true && ctrl.text.isNotEmpty) {
      try {
        await ref.read(dioProvider).post('/inventory/movement', data: {
          'item_name': item.name,
          'type': type,
          'quantity': double.tryParse(ctrl.text) ?? 0,
          'unit': item.unit,
        });
        ref.invalidate(inventoryProvider);
        ref.invalidate(dashboardStatsProvider);
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur lors de l\'enregistrement')));
      }
    }
  }

  Future<void> _openAddTransactionModal() async {
    final ctrlAmount = TextEditingController();
    final ctrlDesc = TextEditingController();
    String type = 'INCOME';
    
    final ok = await showGeneralDialog<bool>(
      context: context,
      barrierDismissible: true,
      barrierLabel: '',
      pageBuilder: (ctx, _, __) => StatefulBuilder(
        builder: (context, setState) => Center(
          child: SingleChildScrollView(
            child: ZirGlassCard(
              width: 320,
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Nouvelle Transaction', style: ZiriaText.headingMedium(color: Theme.of(context).brightness == Brightness.dark ? Colors.white : ZiriaColors.nightBlue)),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(child: GestureDetector(
                        onTap: () => setState(() => type = 'INCOME'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(color: type == 'INCOME' ? ZiriaColors.accentEmerald.withOpacity(0.2) : Colors.transparent, borderRadius: BorderRadius.circular(8)),
                          alignment: Alignment.center,
                          child: Text('Revenu', style: ZiriaText.label(color: type == 'INCOME' ? ZiriaColors.accentEmerald : Colors.grey)),
                        )
                      )),
                      const SizedBox(width: 8),
                      Expanded(child: GestureDetector(
                        onTap: () => setState(() => type = 'EXPENSE'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(color: type == 'EXPENSE' ? ZiriaColors.errorRed.withOpacity(0.2) : Colors.transparent, borderRadius: BorderRadius.circular(8)),
                          alignment: Alignment.center,
                          child: Text('Dépense', style: ZiriaText.label(color: type == 'EXPENSE' ? ZiriaColors.errorRed : Colors.grey)),
                        )
                      )),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: ctrlAmount,
                    keyboardType: TextInputType.number,
                    style: TextStyle(color: Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black),
                    decoration: InputDecoration(
                      labelText: 'Montant (TND)', labelStyle: TextStyle(color: Theme.of(context).brightness == Brightness.dark ? Colors.white70 : Colors.black54),
                      filled: true, fillColor: Theme.of(context).brightness == Brightness.dark ? Colors.white10 : Colors.black.withOpacity(0.05),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: ctrlDesc,
                    style: TextStyle(color: Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black),
                    decoration: InputDecoration(
                      labelText: 'Description', labelStyle: TextStyle(color: Theme.of(context).brightness == Brightness.dark ? Colors.white70 : Colors.black54),
                      filled: true, fillColor: Theme.of(context).brightness == Brightness.dark ? Colors.white10 : Colors.black.withOpacity(0.05),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(child: TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler'))),
                      const SizedBox(width: 12),
                      Expanded(child: ZirGradientButton(label: 'Enregistrer', height: 44, onPressed: () => Navigator.pop(ctx, true))),
                    ],
                  )
                ],
              ),
            ),
          ),
        ),
      ),
    );
    if (ok == true && ctrlAmount.text.isNotEmpty) {
      try {
        await ref.read(dioProvider).post('/finance/records', data: {
          'record_type': type,
          'category': type == 'INCOME' ? 'SALE' : 'OTHER',
          'amount_tnd': double.tryParse(ctrlAmount.text) ?? 0,
          'description': ctrlDesc.text,
        });
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Transaction enregistrée !')));
        ref.invalidate(financeRecordsProvider);
        ref.invalidate(financeSummaryProvider);
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur d\'enregistrement')));
      }
    }
  }

  Future<void> _openJobModal() async {
    final ctrl = TextEditingController();
    final ok = await showGeneralDialog<bool>(
      context: context,
      barrierDismissible: true,
      barrierLabel: '',
      pageBuilder: (ctx, _, __) => Center(
        child: SingleChildScrollView(
          child: ZirGlassCard(
            width: 320,
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Nouvelle Offre', style: ZiriaText.headingMedium(color: Theme.of(context).brightness == Brightness.dark ? Colors.white : ZiriaColors.nightBlue)),
                const SizedBox(height: 16),
                TextField(
                  controller: ctrl,
                  style: TextStyle(color: Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black),
                  decoration: InputDecoration(
                    labelText: 'Type de tâche (ex: Récolte)',
                    labelStyle: TextStyle(color: Theme.of(context).brightness == Brightness.dark ? Colors.white70 : Colors.black54),
                    filled: true,
                    fillColor: Theme.of(context).brightness == Brightness.dark ? Colors.white10 : Colors.black.withOpacity(0.05),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(child: TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler'))),
                    const SizedBox(width: 12),
                    Expanded(child: ZirGradientButton(label: 'Publier', height: 44, onPressed: () => Navigator.pop(ctx, true))),
                  ],
                )
              ],
            ),
          ),
        ),
      ),
    );
    if (ok == true && ctrl.text.isNotEmpty) {
      try {
        final now = DateTime.now();
        final dateStr = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
        
        await ref.read(dioProvider).post('/workers/job-offers', data: {
          'task_type': ctrl.text,
          'daily_pay_tnd': 30, 
          'duration_days': 5,
          'start_date': dateStr,
          'workers_needed': 1,
          'governorate': 'Kasserine',
          'description': 'Offre créée depuis mobile',
          'lat': 35.167, // Kasserine default
          'lng': 8.831,
        });
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Offre publiée !')));
        ref.invalidate(labourOffersProvider);
      } catch (e) {
        String msg = 'Erreur lors de la publication';
        if (e is DioException && e.response?.data != null) {
          final data = e.response?.data;
          if (data is Map && data['message'] != null) msg = data['message'].toString();
        }
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      }
    }
  }

  Future<void> _openSubscriptionModal() async {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        minChildSize: 0.4,
        expand: false,
        builder: (_, scrollController) => Material(
          type: MaterialType.transparency,
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Theme.of(context).brightness == Brightness.dark ? ZiriaColors.bgDeep : Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Consumer(
              builder: (context, ref, _) {
                final plansAsync = ref.watch(subscriptionPlansProvider);
                return ListView(
                  controller: scrollController,
                  children: [
                    Text('Changer d\'abonnement', style: ZiriaText.headingMedium(color: Theme.of(context).brightness == Brightness.dark ? Colors.white : ZiriaColors.nightBlue)),
                    const SizedBox(height: 16),
                    ...plansAsync.when(
                      data: (plans) => plans.map((p) => ListTile(
                        title: Text(p['name_fr'] ?? p['code'], style: ZiriaText.bodyMedium(color: Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.black)),
                        subtitle: Text('${p['price_tnd']} TND / mois', style: ZiriaText.bodySmall(color: ZiriaColors.accentEmerald)),
                        trailing: const Icon(Icons.chevron_right, color: Colors.grey),
                        onTap: () async {
                          Navigator.pop(ctx);
                          try {
                            await ref.read(dioProvider).post('/subscriptions/subscribe', data: {'plan_code': p['code']});
                            if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Abonnement mis à jour !')));
                            ref.invalidate(mySubscriptionProvider);
                          } catch (e) {
                            if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur de mise à jour')));
                          }
                        },
                      )).toList(),
                      loading: () => [const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))],
                      error: (_, __) => [const Text('Impossible de charger les plans')],
                    ),
                    const SizedBox(height: 24),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  // ── Tab 3: Finances ──
  Widget _buildFinances(bool isDark) {
    final summaryAsync = ref.watch(financeSummaryProvider(_period));
    final recordsAsync = ref.watch(financeRecordsProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Period selector
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: ['month', '3months', '6months', 'year'].map((p) {
              final isSel = _period == p;
              final label = p == 'month' ? 'Ce Mois' : (p == 'year' ? 'Année' : p);
              return GestureDetector(
                onTap: () {
                  setState(() => _period = p);
                  ref.invalidate(financeSummaryProvider);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.only(right: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSel ? ZiriaColors.accentEmerald.withOpacity(0.15) : (isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.05)),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: isSel ? ZiriaColors.accentEmerald.withOpacity(0.3) : (isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.05))),
                  ),
                  child: Text(label.toUpperCase(), style: ZiriaText.label(color: isSel ? ZiriaColors.accentEmerald : (isDark ? Colors.white38 : Colors.black38))),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 20),

        // KPI cards
        summaryAsync.when(
          loading: () => const SkeletonCard(height: 100),
          error: (_, __) => const SizedBox.shrink(),
          data: (s) => Row(children: [
            _kpiCard('REVENUS', s.revenue, ZiriaColors.accentEmerald),
            const SizedBox(width: 12),
            _kpiCard('DÉPENSES', s.expenses, ZiriaColors.errorRed),
          ]),
        ),
        const SizedBox(height: 12),
        summaryAsync.when(
          loading: () => const SizedBox.shrink(),
          error: (_, __) => const SizedBox.shrink(),
          data: (s) => _balanceCard(s.balance),
        ),
        const SizedBox(height: 24),

        // Chart section
        _sectionHeader('TENDANCE FLUX', Icons.trending_up_rounded),
        const SizedBox(height: 16),
        summaryAsync.when(
          loading: () => const SkeletonCard(height: 180),
          error: (_, __) => const SizedBox.shrink(),
          data: (s) => s.weeklyData.isEmpty ? const SizedBox.shrink() : _buildChart(s),
        ),
        const SizedBox(height: 32),

        // Transactions
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _sectionHeader('TRANSACTIONS RÉCENTES', Icons.history_rounded),
            IconButton(
              icon: const Icon(Icons.add_circle_outline_rounded, color: ZiriaColors.accentEmerald),
              onPressed: _openAddTransactionModal,
            )
          ],
        ),
        const SizedBox(height: 12),
        recordsAsync.when(
          loading: () => const SkeletonCard(height: 200),
          error: (_, __) => const SizedBox.shrink(),
          data: (records) => Column(
            children: records.map((r) => _recordTile(r, isDark)).toList(),
          ),
        ),
        const SizedBox(height: 24),
        ZiriaButton(
          label: 'Exporter Relevé PDF',
          icon: Icons.picture_as_pdf_rounded,
          isOutlined: true,
          width: double.infinity,
          onPressed: () async {
            final doc = pw.Document();
            doc.addPage(pw.Page(build: (_) => pw.Center(child: pw.Text('Relevé Financier ZirIA'))));
            await Printing.sharePdf(bytes: await doc.save(), filename: 'releve-ziria.pdf');
          },
        ),
        const SizedBox(height: 40),
      ]),
    );
  }

  Widget _kpiCard(String label, double value, Color color, {String suffix = '', bool hideCurrency = false}) => Expanded(
        child: ZirGlassCard(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: ZiriaText.label(color: Theme.of(context).brightness == Brightness.dark ? Colors.white38 : Colors.black54, fontSize: 10)),
            const SizedBox(height: 8),
            Text('${hideCurrency ? value.toInt() : _fmt.format(value)}$suffix', style: ZiriaText.headingMedium(color: color), overflow: TextOverflow.ellipsis),
            if (!hideCurrency)
              Text('TND', style: ZiriaText.bodySmall(color: Theme.of(context).brightness == Brightness.dark ? Colors.white24 : Colors.black26)),
          ]),
        ),
      );

  Widget _balanceCard(double val) => ZirGlassCard(
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          Text('SOLDE NET', style: ZiriaText.label(color: Theme.of(context).brightness == Brightness.dark ? Colors.white38 : Colors.black54)),
          const Spacer(),
          Text('${val >= 0 ? '+' : ''}${_fmt.format(val)} TND', 
              style: ZiriaText.headingMedium(color: val >= 0 ? Colors.blue : ZiriaColors.errorRed)),
        ]),
      );

  Widget _buildChart(FinanceSummary s) => Container(
        height: 180,
        padding: const EdgeInsets.only(right: 16, top: 16),
        child: LineChart(LineChartData(
          gridData: FlGridData(show: true, drawVerticalLine: false, getDrawingHorizontalLine: (v) => FlLine(color: Colors.white.withOpacity(0.05), strokeWidth: 1)),
          borderData: FlBorderData(show: false),
          titlesData: const FlTitlesData(show: false),
          lineBarsData: [
            LineChartBarData(
              spots: s.weeklyData.asMap().entries.map((e) => FlSpot(e.key.toDouble(), (double.tryParse(e.value['revenue']?.toString() ?? '0') ?? 0))).toList(),
              color: ZiriaColors.accentEmerald,
              isCurved: true, barWidth: 3, dotData: const FlDotData(show: false),
              belowBarData: BarAreaData(show: true, gradient: LinearGradient(colors: [ZiriaColors.accentEmerald.withOpacity(0.2), ZiriaColors.accentEmerald.withOpacity(0)])),
            ),
            LineChartBarData(
              spots: s.weeklyData.asMap().entries.map((e) => FlSpot(e.key.toDouble(), (double.tryParse(e.value['expenses']?.toString() ?? '0') ?? 0))).toList(),
              color: ZiriaColors.errorRed,
              isCurved: true, barWidth: 2, dotData: const FlDotData(show: false),
            ),
          ],
        )),
      );

  Widget _recordTile(FinanceRecord r, bool isDark) {
    final isIncome = r.category == 'SALE';
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.03) : Colors.black.withOpacity(0.03),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(
            color: (isIncome ? ZiriaColors.accentEmerald : ZiriaColors.errorRed).withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(isIncome ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded, 
              color: isIncome ? ZiriaColors.accentEmerald : ZiriaColors.errorRed, size: 18),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(r.description, style: ZiriaText.bodyMedium(color: isDark ? Colors.white : ZiriaColors.nightBlue), maxLines: 1, overflow: TextOverflow.ellipsis),
            Text(DateFormat('dd MMM yyyy').format(r.date), style: ZiriaText.bodySmall(color: isDark ? Colors.white30 : Colors.black38)),
          ]
        )),
        Text('${isIncome ? '+' : '-'}${_fmt.format(r.amount)}', 
            style: ZiriaText.labelBold(color: isIncome ? ZiriaColors.accentEmerald : ZiriaColors.errorRed)),
      ]),
    );
  }

  // ── Tab 4: Labour ──
  Widget _buildLabour(bool isDark) {
    final offersAsync = ref.watch(labourOffersProvider);

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(labourOffersProvider),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _sectionHeader('MES OFFRES D\'EMPLOI', Icons.work_rounded),
                ZiriaButton(
                  label: 'Créer',
                  icon: Icons.add_rounded,
                  onPressed: _openJobModal,
                  height: 36,
                )
              ],
            ),
            const SizedBox(height: 16),
            offersAsync.when(
              loading: () => const SkeletonCard(height: 100),
              error: (_, __) => const SizedBox.shrink(),
              data: (offers) {
                if (offers.isEmpty) {
                  return const EmptyState(title: 'Aucune offre', emoji: '🧑‍🌾', subtitle: 'Créez une offre pour recruter');
                }
                return Column(
                  children: offers.map((o) {
                    final isOpen = o['status'] == 'OPEN';
                    return ZirGlassCard(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: (isOpen ? ZiriaColors.accentEmerald : Colors.grey).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(Icons.agriculture_rounded, color: isOpen ? ZiriaColors.accentEmerald : Colors.grey),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(o['task_type'], style: ZiriaText.headingSmall(color: isDark ? Colors.white : ZiriaColors.nightBlue)),
                                Text('${o['daily_pay_tnd']} TND/jour • ${o['date']}', style: ZiriaText.bodySmall(color: isDark ? Colors.white54 : Colors.black54)),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: (isOpen ? ZiriaColors.accentEmerald : Colors.grey).withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(isOpen ? 'OUVERTE' : 'POURVUE', style: ZiriaText.label(color: isOpen ? ZiriaColors.accentEmerald : (isDark ? Colors.white70 : Colors.black87))),
                          )
                        ],
                      )
                    );
                  }).toList(),
                );
              }
            )
          ],
        ),
      ),
    );
  }

  // ── Tab 5: Subscription ──
  Widget _buildSubscription(bool isDark) {
    final subAsync = ref.watch(mySubscriptionProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionHeader('MON FORFAIT ACTUEL', Icons.verified_rounded),
          const SizedBox(height: 16),
          subAsync.when(
            loading: () => const SkeletonCard(height: 200),
            error: (_, __) => ErrorState(
              title: 'Erreur',
              subtitle: 'Impossible de charger l\'abonnement',
              onRetry: () => ref.invalidate(mySubscriptionProvider),
            ),
            data: (subData) {
              final planName = subData?['plan']?['name_fr'] ?? subData?['plan']?['code'] ?? 'Free Basic';
              final isActive = subData?['status'] == 'ACTIVE';
              return ZirGlassCard(
                padding: const EdgeInsets.all(24),
                border: Border.all(color: ZiriaColors.accentEmerald.withOpacity(0.5)),
                backgroundColor: ZiriaColors.accentEmerald.withOpacity(0.05),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(planName, style: ZiriaText.headingMedium(color: isDark ? Colors.white : ZiriaColors.nightBlue)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: isActive ? ZiriaColors.accentEmerald : Colors.grey,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(isActive ? 'ACTIF' : 'INACTIF', style: ZiriaText.labelBold(color: Colors.white)),
                        )
                      ],
                    ),
                    const SizedBox(height: 16),
                    _featureRow('Annonces illimitées', true, isDark),
                    _featureRow('Parcelles illimitées', true, isDark),
                    _featureRow('Dashboard financier complet', true, isDark),
                    _featureRow('Accès CRM ouvriers', true, isDark),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: TextButton(
                        onPressed: _openSubscriptionModal,
                        child: Text('Gérer mon abonnement', style: ZiriaText.labelBold(color: ZiriaColors.accentEmerald)),
                      ),
                    )
                  ],
                ),
              );
            }
          )
        ],
      ),
    );
  }

  Widget _featureRow(String text, bool included, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(included ? Icons.check_circle_rounded : Icons.cancel_rounded, 
               color: included ? ZiriaColors.accentEmerald : (isDark ? Colors.white30 : Colors.black38), size: 18),
          const SizedBox(width: 8),
          Text(text, style: ZiriaText.bodyMedium(color: isDark ? Colors.white70 : Colors.black87)),
        ],
      ),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _ActionBtn({required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
        child: Icon(icon, color: color, size: 20),
      ),
    );
  }
}
