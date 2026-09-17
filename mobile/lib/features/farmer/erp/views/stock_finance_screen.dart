import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/erp_notifier.dart';

class StockFinanceScreen extends ConsumerStatefulWidget {
  const StockFinanceScreen({super.key});
  @override
  ConsumerState<StockFinanceScreen> createState() => _StockFinanceScreenState();
}

class _StockFinanceScreenState extends ConsumerState<StockFinanceScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(erpNotifierProvider);
    final notifier = ref.read(erpNotifierProvider.notifier);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF080D18) : const Color(0xFFF5F7FA);
    final cardBg = isDark ? const Color(0xFF0F1829) : Colors.white;
    final textPrimary = isDark ? Colors.white : const Color(0xFF0F1829);
    final textMuted = isDark ? Colors.white38 : const Color(0xFF9CA3AF);
    final border = isDark ? Colors.white.withOpacity(0.07) : Colors.black.withOpacity(0.06);

    if (state.isLoading) {
      return Scaffold(
        backgroundColor: bg,
        body: const Center(child: CircularProgressIndicator(color: Color(0xFF10B981), strokeWidth: 2)),
      );
    }

    final finance = state.financeSummary;
    final balance = finance.balance;
    final isProfit = balance >= 0;

    return Scaffold(
      backgroundColor: bg,
      body: NestedScrollView(
        headerSliverBuilder: (context, _) => [
          SliverAppBar(
            expandedHeight: 120,
            backgroundColor: bg,
            pinned: true,
            elevation: 0,
            flexibleSpace: FlexibleSpaceBar(
              titlePadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              title: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('ERP · Mon Exploitation',
                    style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800, color: textPrimary)),
                  Text('Intelligence Opérationnelle',
                    style: GoogleFonts.inter(fontSize: 11, color: textMuted)),
                ],
              ),
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topRight,
                    colors: [
                      const Color(0xFF10B981).withOpacity(0.08),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            bottom: TabBar(
              controller: _tabController,
              labelColor: const Color(0xFF10B981),
              unselectedLabelColor: textMuted,
              indicatorColor: const Color(0xFF10B981),
              indicatorWeight: 2,
              labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 13),
              tabs: const [
                Tab(icon: Icon(Icons.inventory_2_outlined, size: 18), text: 'Stocks'),
                Tab(icon: Icon(Icons.account_balance_wallet_outlined, size: 18), text: 'Finances'),
              ],
            ),
          ),
        ],
        body: TabBarView(
          controller: _tabController,
          children: [
            // ── STOCK TAB ──
            _buildStockTab(context, state, cardBg, textPrimary, textMuted, border, isDark),
            // ── FINANCE TAB ──
            _buildFinanceTab(context, state, notifier, finance, balance, isProfit, cardBg, textPrimary, textMuted, border, isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildStockTab(BuildContext context, ErpState state, Color cardBg, Color textPrimary, Color textMuted, Color border, bool isDark) {
    return CustomScrollView(
      slivers: [
        // KPI Row
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Row(
              children: [
                Expanded(child: _KpiMini(
                  label: 'Produits', value: '${state.productionStock.length}',
                  unit: 'réf.', color: const Color(0xFF10B981), icon: Icons.inventory_2_rounded,
                  cardBg: cardBg, textPrimary: textPrimary, textMuted: textMuted,
                )),
                const SizedBox(width: 12),
                Expanded(child: _KpiMini(
                  label: 'Intrants', value: '${state.inputsStock.length}',
                  unit: 'réf.', color: const Color(0xFF3B82F6), icon: Icons.science_rounded,
                  cardBg: cardBg, textPrimary: textPrimary, textMuted: textMuted,
                )),
                const SizedBox(width: 12),
                Expanded(child: _KpiMini(
                  label: 'Alertes', value: '${state.productionStock.where((i) => i.isLow).length}',
                  unit: 'bas', color: const Color(0xFFEF4444), icon: Icons.warning_amber_rounded,
                  cardBg: cardBg, textPrimary: textPrimary, textMuted: textMuted,
                )),
              ],
            ),
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 20)),
        // Section: Production
        _SectionHeader(title: 'Stock de Production', icon: Icons.grass_rounded, color: const Color(0xFF10B981), count: state.productionStock.length, textPrimary: textPrimary, textMuted: textMuted),
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (ctx, i) => _StockCard(item: state.productionStock[i], cardBg: cardBg, border: border, textPrimary: textPrimary),
              childCount: state.productionStock.length,
            ),
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 24)),
        // Section: Inputs
        _SectionHeader(title: "Stock d'Intrants", icon: Icons.science_rounded, color: const Color(0xFF3B82F6), count: state.inputsStock.length, textPrimary: textPrimary, textMuted: textMuted),
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (ctx, i) => _StockCard(item: state.inputsStock[i], cardBg: cardBg, border: border, textPrimary: textPrimary),
              childCount: state.inputsStock.length,
            ),
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 80)),
      ],
    );
  }

  Widget _buildFinanceTab(BuildContext context, ErpState state, dynamic notifier, dynamic finance, double balance, bool isProfit, Color cardBg, Color textPrimary, Color textMuted, Color border, bool isDark) {
    final accentColor = isProfit ? const Color(0xFF10B981) : const Color(0xFFEF4444);

    return CustomScrollView(
      slivers: [
        // Hero Finance Card
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                  colors: isProfit
                    ? [const Color(0xFF0D3B2E), const Color(0xFF071A14)]
                    : [const Color(0xFF3B1020), const Color(0xFF1A0810)],
                ),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: accentColor.withOpacity(0.2)),
                boxShadow: [BoxShadow(color: accentColor.withOpacity(0.15), blurRadius: 32, offset: const Offset(0,8))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Icon(isProfit ? Icons.trending_up_rounded : Icons.trending_down_rounded, color: accentColor, size: 18),
                    const SizedBox(width: 8),
                    Text(finance.monthLabel, style: GoogleFonts.inter(color: accentColor.withOpacity(0.85), fontSize: 13, fontWeight: FontWeight.w600)),
                  ]),
                  const SizedBox(height: 20),
                  Text('${isProfit ? '+' : '-'}${balance.abs().toStringAsFixed(0)} TND',
                    style: GoogleFonts.inter(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w900, letterSpacing: -1.5)),
                  Text('Solde Net du Mois', style: GoogleFonts.inter(color: Colors.white38, fontSize: 13)),
                  const SizedBox(height: 20),
                  Container(height: 1, color: Colors.white.withOpacity(0.08)),
                  const SizedBox(height: 16),
                  Row(children: [
                    Expanded(child: _FinancePill(label: 'Revenus', value: finance.revenue, color: const Color(0xFF10B981))),
                    Container(width: 1, height: 36, color: Colors.white12),
                    Expanded(child: _FinancePill(label: 'Dépenses', value: finance.expenses, color: const Color(0xFFEF4444))),
                  ]),
                ],
              ),
            ),
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 20)),
        // KPI row
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(children: [
              Expanded(child: _KpiMini(label: 'Revenus Bruts', value: finance.revenue.toStringAsFixed(0), unit: 'TND', color: const Color(0xFF10B981), icon: Icons.arrow_downward_rounded, cardBg: cardBg, textPrimary: textPrimary, textMuted: textMuted)),
              const SizedBox(width: 12),
              Expanded(child: _KpiMini(label: 'Charges', value: finance.expenses.toStringAsFixed(0), unit: 'TND', color: const Color(0xFFEF4444), icon: Icons.arrow_upward_rounded, cardBg: cardBg, textPrimary: textPrimary, textMuted: textMuted)),
            ]),
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 24)),
        // Export button
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: GestureDetector(
              onTap: state.isExporting ? null : notifier.exportPdf,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                height: 54,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: state.isExporting
                    ? null
                    : const LinearGradient(colors: [Color(0xFF10B981), Color(0xFF059669)]),
                  color: state.isExporting ? cardBg : null,
                  border: state.isExporting ? Border.all(color: const Color(0xFF10B981).withOpacity(0.3)) : null,
                  boxShadow: state.isExporting ? null : [BoxShadow(color: const Color(0xFF10B981).withOpacity(0.3), blurRadius: 20, offset: const Offset(0,6))],
                ),
                child: Center(
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.picture_as_pdf_rounded, color: state.isExporting ? const Color(0xFF10B981) : Colors.white, size: 20),
                    const SizedBox(width: 10),
                    Text(state.isExporting ? 'Génération...' : 'Exporter Rapport PDF',
                      style: GoogleFonts.inter(color: state.isExporting ? const Color(0xFF10B981) : Colors.white, fontSize: 14, fontWeight: FontWeight.w700)),
                  ]),
                ),
              ),
            ),
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 80)),
      ],
    );
  }
}

// ── Mini KPI Card ────────────────────────────────────────────────────────────
class _KpiMini extends StatelessWidget {
  final String label, value, unit;
  final Color color;
  final IconData icon;
  final Color cardBg, textPrimary, textMuted;
  const _KpiMini({required this.label, required this.value, required this.unit, required this.color, required this.icon, required this.cardBg, required this.textPrimary, required this.textMuted});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: color.withOpacity(0.15)),
        boxShadow: [BoxShadow(color: color.withOpacity(0.06), blurRadius: 16)],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(8)),
          child: Icon(icon, color: color, size: 14),
        ),
        const SizedBox(height: 10),
        RichText(text: TextSpan(children: [
          TextSpan(text: value, style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w900, color: textPrimary, letterSpacing: -0.5)),
          TextSpan(text: ' $unit', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: textMuted)),
        ])),
        Text(label, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: textMuted, letterSpacing: 0.3)),
      ]),
    );
  }
}

// ── Section Header ───────────────────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final int count;
  final Color textPrimary, textMuted;
  const _SectionHeader({required this.title, required this.icon, required this.color, required this.count, required this.textPrimary, required this.textMuted});

  @override
  Widget build(BuildContext context) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
        child: Row(children: [
          Container(padding: const EdgeInsets.all(6), decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(8)), child: Icon(icon, color: color, size: 14)),
          const SizedBox(width: 10),
          Text(title, style: GoogleFonts.inter(color: textPrimary, fontSize: 15, fontWeight: FontWeight.w800)),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
            child: Text('$count', style: GoogleFonts.inter(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
          ),
        ]),
      ),
    );
  }
}

// ── Stock Card ───────────────────────────────────────────────────────────────
class _StockCard extends StatelessWidget {
  final StockItem item;
  final Color cardBg, border, textPrimary;
  const _StockCard({required this.item, required this.cardBg, required this.border, required this.textPrimary});

  @override
  Widget build(BuildContext context) {
    final isLow = item.isLow;
    final accent = isLow ? const Color(0xFFEF4444) : const Color(0xFF10B981);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isLow ? const Color(0xFFEF4444).withOpacity(0.3) : border),
      ),
      child: Row(children: [
        Text(item.emoji, style: const TextStyle(fontSize: 24)),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(item.name, style: GoogleFonts.inter(color: textPrimary, fontSize: 14, fontWeight: FontWeight.w700)),
          if (isLow) Text('Stock bas — réapprovisionner', style: GoogleFonts.inter(color: const Color(0xFFEF4444), fontSize: 10, fontWeight: FontWeight.w600)),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('${item.quantity} ${item.unit}', style: GoogleFonts.inter(color: accent, fontSize: 14, fontWeight: FontWeight.w800)),
          if (isLow) Container(
            margin: const EdgeInsets.only(top: 3),
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            decoration: BoxDecoration(color: const Color(0xFFEF4444).withOpacity(0.12), borderRadius: BorderRadius.circular(6)),
            child: Text('Bas', style: GoogleFonts.inter(color: const Color(0xFFEF4444), fontSize: 9, fontWeight: FontWeight.w700)),
          ),
        ]),
      ]),
    );
  }
}

// ── Finance Pill ─────────────────────────────────────────────────────────────
class _FinancePill extends StatelessWidget {
  final String label;
  final double value;
  final Color color;
  const _FinancePill({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Text(label, style: GoogleFonts.inter(color: Colors.white38, fontSize: 11)),
      const SizedBox(height: 4),
      Text('${value.toStringAsFixed(0)} TND',
        style: GoogleFonts.inter(color: color, fontSize: 14, fontWeight: FontWeight.w800)),
    ]);
  }
}
