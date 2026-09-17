import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/zir_design_system.dart';
import 'package:printing/printing.dart';
import 'package:pdf/widgets.dart' as pw;
import 'dart:async';
import '../providers/chat_notifier.dart';

// ── Screen ──────────────────────────────────────────────────────────────────
class AgentChatScreen extends ConsumerStatefulWidget {
  const AgentChatScreen({super.key});
  @override
  ConsumerState<AgentChatScreen> createState() => _AgentChatScreenState();
}

class _AgentChatScreenState extends ConsumerState<AgentChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final chatAsync = ref.watch(chatNotifierProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Auto-scroll when messages change
    ref.listen(chatNotifierProvider, (previous, next) {
      if (next.hasValue && previous?.value?.messages.length != next.value?.messages.length) {
        _scrollToBottom();
      }
    });

    return Scaffold(
      backgroundColor: isDark ? ZiriaColors.bgDeep : ZiriaColors.bgLight,
      drawer: _buildHistoryDrawer(context, chatAsync.value?.groupedConversations ?? {}, isDark),
      body: SafeArea(
        bottom: false,
        child: chatAsync.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: ZiriaColors.accentEmerald, strokeWidth: 2),
          ),
          error: (err, stack) => Center(child: Text('Erreur: $err', style: const TextStyle(color: Colors.white))),
          data: (chatState) {
            final messages = chatState.messages;
            return Column(
              children: [
                _buildHeader(context, isDark),
                _buildQuickActions(isDark),
                Expanded(
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                    itemCount: messages.length,
                    itemBuilder: (context, index) {
                      final msg = messages[index];
                      final isLast = index == messages.length - 1;
                      return _ChatBubble(message: msg, isDark: isDark, isLast: isLast);
                    },
                  ),
                ),
                if (chatState.isTyping) _buildTypingIndicator(isDark),
                _buildInputArea(context, isDark, chatState.isListening, chatState.messages),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, bool isDark) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Row(
        children: [
          Builder(
            builder: (ctx) => _HeaderBtn(
              icon: Icons.history_rounded,
              isDark: isDark,
              onTap: () => Scaffold.of(ctx).openDrawer(),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('ZirPulse IA', style: ZiriaText.headingSmall(color: isDark ? Colors.white : ZiriaColors.textLight)),
                Row(
                  children: [
                    Container(width: 6, height: 6, decoration: const BoxDecoration(color: ZiriaColors.accentEmerald, shape: BoxShape.circle)),
                    const SizedBox(width: 4),
                    Text('En ligne', style: ZiriaText.label(color: isDark ? Colors.white38 : ZiriaColors.textLightMuted)),
                  ],
                ),
              ],
            ),
          ),
          _HeaderBtn(
            icon: Icons.add_comment_rounded,
            color: ZiriaColors.accentEmerald,
            isDark: isDark,
            onTap: () => ref.read(chatNotifierProvider.notifier).newConversation(),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryDrawer(BuildContext context, Map<String, List<Map<String, dynamic>>> groupedConversations, bool isDark) {
    final textColor = isDark ? Colors.white : ZiriaColors.textLight;
    final mutedColor = isDark ? Colors.white38 : ZiriaColors.textLightMuted;

    return Drawer(
      backgroundColor: isDark ? ZiriaColors.bgDeep : Colors.white,
      child: Column(
        children: [
          DrawerHeader(
            decoration: BoxDecoration(
              color: ZiriaColors.accentEmerald.withOpacity(0.1),
              border: Border(bottom: BorderSide(color: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.05))),
            ),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Image.asset('assets/images/ziria-icon.png', width: 50, height: 50),
                  const SizedBox(height: 10),
                  Text('Historique ZirIA', style: ZiriaText.headingSmall(color: textColor)),
                ],
              ),
            ),
          ),
          Expanded(
            child: groupedConversations.isEmpty 
              ? Center(child: Text('Aucune conversation', style: ZiriaText.bodySmall(color: mutedColor)))
              : ListView(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  children: groupedConversations.entries.map((group) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                          child: Text(
                            group.key.toUpperCase(),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.2,
                              color: mutedColor.withOpacity(0.5),
                            ),
                          ),
                        ),
                        ...group.value.map((conv) {
                          final date = conv['updated_at'] != null ? DateTime.parse(conv['updated_at']) : DateTime.now();
                          final timeStr = '${date.hour}:${date.minute.toString().padLeft(2, '0')}';
                          final isActive = ref.read(chatNotifierProvider).value?.dbId == conv['id'];

                          return ListTile(
                            leading: Icon(Icons.chat_bubble_outline_rounded, color: isActive ? ZiriaColors.accentEmerald : mutedColor),
                            title: Text(conv['title'] ?? 'Nouvelle discussion', style: ZiriaText.bodySmall(color: isActive ? ZiriaColors.accentEmerald : textColor.withOpacity(0.7))),
                            trailing: Text(timeStr, style: TextStyle(fontSize: 10, color: mutedColor.withOpacity(0.5))),
                            selected: isActive,
                            onTap: () {
                              Navigator.pop(context);
                              ref.read(chatNotifierProvider.notifier).loadConversation(conv['id'], conv['session_id']);
                            },
                          );
                        }),
                      ],
                    );
                  }).toList(),
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions(bool isDark) {
    final actions = [
      {'label': 'Météo', 'icon': Icons.wb_sunny_rounded},
      {'label': 'Prix Huile', 'icon': Icons.currency_exchange_rounded},
      {'label': 'Mes Alertes', 'icon': Icons.warning_amber_rounded},
      {'label': 'Expert', 'icon': Icons.person_search_rounded},
    ];
    
    return Container(
      height: 60,
      margin: const EdgeInsets.only(top: 8),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: actions.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (ctx, i) => _QuickActionChip(
          label: actions[i]['label'] as String,
          icon: actions[i]['icon'] as IconData,
          isDark: isDark,
          onTap: () {
            ref.read(chatNotifierProvider.notifier).sendTextMessage(actions[i]['label'] as String);
            _scrollToBottom();
          },
        ),
      ),
    );
  }

  Widget _buildTypingIndicator(bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: (isDark ? Colors.white : Colors.black).withOpacity(0.05),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(
                  width: 12, height: 12,
                  child: CircularProgressIndicator(strokeWidth: 1.5, color: ZiriaColors.accentEmerald),
                ),
                const SizedBox(width: 8),
                Text('ZirPulse réfléchit...', style: ZiriaText.bodySmall(color: isDark ? Colors.white38 : ZiriaColors.textLightMuted)),
              ],
            ),
          ),
          const Spacer(),
        ],
      ),
    );
  }

  Widget _buildInputArea(BuildContext context, bool isDark, bool isListening, List<ChatMessage> messages) {
    final bottomPad = MediaQuery.of(context).padding.bottom;
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: EdgeInsets.fromLTRB(12, 10, 12, 10 + bottomPad),
          decoration: BoxDecoration(
            color: (isDark ? ZiriaColors.bgDeep : Colors.white).withOpacity(0.92),
            border: Border(top: BorderSide(color: (isDark ? Colors.white : Colors.black).withOpacity(0.07))),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // Mic button
              _InputBtn(
                icon: isListening ? Icons.stop_circle_rounded : Icons.mic_none_rounded,
                color: isListening ? ZiriaColors.errorRed : ZiriaColors.textMuted,
                onTap: () {
                  ref.read(chatNotifierProvider.notifier).toggleListening();
                  if (!isListening) {
                    Future.delayed(const Duration(seconds: 2), () {
                      ref.read(chatNotifierProvider.notifier).toggleListening();
                      ref.read(chatNotifierProvider.notifier).sendAudioMessage('dummy_url');
                    });
                  }
                },
              ),
              const SizedBox(width: 8),
              // Text field
              Expanded(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 120),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(isDark ? 0.07 : 0.8),
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(color: (isDark ? Colors.white : Colors.black).withOpacity(0.1)),
                    ),
                    child: TextField(
                      controller: _controller,
                      maxLines: null,
                      style: TextStyle(
                        color: isDark ? Colors.white : ZiriaColors.textLight,
                        fontSize: 14,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Posez votre question...',
                        hintStyle: TextStyle(color: isDark ? Colors.white30 : Colors.black38, fontSize: 14),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                      ),
                      onSubmitted: (val) {
                        if (val.trim().isNotEmpty) {
                          ref.read(chatNotifierProvider.notifier).sendTextMessage(val.trim());
                          _controller.clear();
                          _scrollToBottom();
                        }
                      },
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // PDF export button
              _InputBtn(
                icon: Icons.picture_as_pdf_rounded,
                color: ZiriaColors.textMuted,
                onTap: () => _exportChat(messages),
              ),
              const SizedBox(width: 6),
              // Send button
              _InputBtn(
                icon: Icons.send_rounded,
                color: ZiriaColors.accentEmerald,
                onTap: () {
                  if (_controller.text.trim().isNotEmpty) {
                    ref.read(chatNotifierProvider.notifier).sendTextMessage(_controller.text.trim());
                    _controller.clear();
                    _scrollToBottom();
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _exportChat(List<ChatMessage> messages) async {
    final doc = pw.Document();
    doc.addPage(pw.Page(
      build: (pw.Context context) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text('Rapport ZirPulse IA', style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 20),
          ...messages.map((m) => pw.Container(
                margin: const pw.EdgeInsets.only(bottom: 10),
                child: pw.Text('${m.sender == MessageSender.farmer ? 'Agriculteur' : 'ZirPulse'}: ${m.content}'),
              )),
        ],
      ),
    ));
    await Printing.sharePdf(bytes: await doc.save(), filename: 'zirpulse_report.pdf');
  }
}

class _QuickActionChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isDark;
  final VoidCallback onTap;
  const _QuickActionChip({required this.label, required this.icon, required this.isDark, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ZirGlassCard(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        backgroundColor: (isDark ? Colors.white : Colors.black).withOpacity(0.04),
        child: Row(
          children: [
            Icon(icon, color: ZiriaColors.accentEmerald, size: 16),
            const SizedBox(width: 8),
            Text(label, style: ZiriaText.label(color: isDark ? Colors.white70 : ZiriaColors.textLight)),
          ],
        ),
      ),
    );
  }
}

class _InputBtn extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _InputBtn({required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 44, height: 44,
        decoration: BoxDecoration(
          color: color.withOpacity(0.12),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Icon(icon, color: color, size: 20),
      ),
    );
  }
}

class _ChatBubble extends StatefulWidget {
  final ChatMessage message;
  final bool isDark;
  final bool isLast;
  const _ChatBubble({required this.message, required this.isDark, this.isLast = false});

  @override
  State<_ChatBubble> createState() => _ChatBubbleState();
}

class _ChatBubbleState extends State<_ChatBubble> {
  String displayedText = '';
  Timer? _timer;
  int _charIndex = 0;

  @override
  void initState() {
    super.initState();
    final isAgent = widget.message.sender == MessageSender.agent;
    if (isAgent && widget.isLast && widget.message.id != 'init') {
      _startTypewriter();
    } else {
      displayedText = widget.message.content;
    }
  }

  void _startTypewriter() {
    _timer = Timer.periodic(const Duration(milliseconds: 30), (timer) {
      if (_charIndex < widget.message.content.length) {
        if (mounted) {
          setState(() {
            displayedText += widget.message.content[_charIndex];
            _charIndex++;
          });
        }
      } else {
        _timer?.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isUser = widget.message.sender == MessageSender.farmer;
    final isDark = widget.isDark;
    final agentBubbleBg   = isDark ? Colors.white.withOpacity(0.07) : Colors.black.withOpacity(0.05);
    final agentBubbleBorder = isDark ? Colors.white.withOpacity(0.09) : Colors.black.withOpacity(0.08);
    final agentTextColor  = isDark ? Colors.white.withOpacity(0.88) : ZiriaColors.textLight;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser) ...[
            Image.asset(
              'assets/images/ziria-icon.png',
              width: 32, height: 32, fit: BoxFit.contain,
              errorBuilder: (_, __, ___) => Container(
                width: 28, height: 28,
                decoration: BoxDecoration(gradient: ZiriaColors.primaryGradient, borderRadius: BorderRadius.circular(8)),
                child: const Center(child: Text('Z', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold))),
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: isUser ? ZiriaColors.accentEmerald : agentBubbleBg,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(18),
                  topRight: const Radius.circular(18),
                  bottomLeft: Radius.circular(isUser ? 18 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 18),
                ),
                border: isUser ? null : Border.all(color: agentBubbleBorder),
              ),
              child: Text(
                displayedText,
                style: ZiriaText.bodyMedium(
                  color: isUser ? Colors.white : agentTextColor,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),
          if (isUser) ...[
            const SizedBox(width: 8),
            CircleAvatar(
              radius: 12,
              backgroundColor: isDark ? Colors.white12 : Colors.black.withOpacity(0.08),
              child: Icon(Icons.person, size: 14, color: isDark ? Colors.white38 : ZiriaColors.textLightMuted),
            ),
          ],
        ],
      ),
    );
  }
}

class _HeaderBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final Color? color;
  final bool isDark;

  const _HeaderBtn({required this.icon, required this.onTap, this.color, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final baseColor = color ?? (isDark ? Colors.white : ZiriaColors.textLight);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: baseColor.withOpacity(0.05),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: baseColor.withOpacity(0.1)),
        ),
        child: Icon(icon, color: baseColor.withOpacity(0.7), size: 20),
      ),
    );
  }
}
