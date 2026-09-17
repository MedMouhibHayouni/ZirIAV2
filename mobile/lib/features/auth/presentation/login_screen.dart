import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/zir_design_system.dart';
import '../providers/auth_notifier.dart';

/// ZirIA Sentinel — Premium Login Screen v3.0
/// Full-screen dark hero + glassmorphism form card + staggered entrance
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with TickerProviderStateMixin {
  final _emailCtrl    = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _formKey      = GlobalKey<FormState>();
  bool _obscurePass   = true;
  bool _emailFocused  = false;
  bool _passFocused   = false;

  late AnimationController _entranceCtrl;
  late AnimationController _orbCtrl;
  late Animation<double>   _heroFade;
  late Animation<Offset>   _cardSlide;
  late Animation<double>   _cardFade;
  late Animation<double>   _orbRotate;

  @override
  void initState() {
    super.initState();

    _orbCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 20))..repeat();
    _orbRotate = Tween<double>(begin: 0.0, end: 2 * math.pi)
        .animate(CurvedAnimation(parent: _orbCtrl, curve: Curves.linear));

    _entranceCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));
    _heroFade  = Tween<double>(begin: 0.0, end: 1.0)
        .animate(CurvedAnimation(parent: _entranceCtrl, curve: const Interval(0.0, 0.5, curve: Curves.easeOut)));
    _cardSlide = Tween<Offset>(begin: const Offset(0, 0.3), end: Offset.zero)
        .animate(CurvedAnimation(parent: _entranceCtrl, curve: const Interval(0.3, 1.0, curve: Curves.easeOutCubic)));
    _cardFade  = Tween<double>(begin: 0.0, end: 1.0)
        .animate(CurvedAnimation(parent: _entranceCtrl, curve: const Interval(0.3, 1.0, curve: Curves.easeOut)));

    _entranceCtrl.forward();
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _entranceCtrl.dispose();
    _orbCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (_formKey.currentState?.validate() ?? false) {
      await ref.read(authNotifierProvider.notifier).login(
        _emailCtrl.text.trim(),
        _passwordCtrl.text,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authNotifierProvider);
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: ZiriaColors.bgDeep,
      resizeToAvoidBottomInset: true,
      body: Stack(
        children: [
          // ── Animated background ─────────────────────────────────────
          Positioned.fill(
            child: AnimatedBuilder(
              animation: _orbRotate,
              builder: (_, __) => CustomPaint(painter: _LoginBgPainter(_orbRotate.value)),
            ),
          ),

          // ── Top hero gradient ───────────────────────────────────────
          Positioned(
            top: 0, left: 0, right: 0,
            child: Container(
              height: size.height * 0.42,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF030D06), Color(0xFF052E16), Color(0xFF0A0E1A)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ),

          // ── Content ─────────────────────────────────────────────────
          SafeArea(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  children: [
                    SizedBox(height: size.height * 0.06),

                    // ── Hero: Logo ──────────────────────────────────────────
                    FadeTransition(
                      opacity: _heroFade,
                      child: Column(children: [
                        // Soft glow behind logo
                        Stack(alignment: Alignment.center, children: [
                          Container(
                            width: 220, height: 120,
                            decoration: BoxDecoration(
                              shape: BoxShape.rectangle,
                              gradient: RadialGradient(
                                colors: [ZiriaColors.accentEmerald.withOpacity(0.12), Colors.transparent],
                              ),
                            ),
                          ),
                          Image.asset(
                            'assets/images/ziria-logo-main.png',
                            height: 64,
                            fit: BoxFit.contain,
                          ),
                        ]),

                        const SizedBox(height: 24),
                        Text('Bienvenue sur ZirIA Sentinel',
                          style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: -0.5)),
                        const SizedBox(height: 8),
                        Text('L\'excellence agricole au service de la Tunisie',
                          style: ZiriaText.bodySmall(color: ZiriaColors.textSecondary, fontWeight: FontWeight.w500),
                          textAlign: TextAlign.center),
                      ]),
                    ),

                    SizedBox(height: size.height * 0.05),

                    // ── Glassmorphism form card ─────────────────────
                    SlideTransition(
                      position: _cardSlide,
                      child: FadeTransition(
                        opacity: _cardFade,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(28),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
                            child: Container(
                              padding: const EdgeInsets.all(28),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.04),
                                borderRadius: BorderRadius.circular(28),
                                border: Border.all(color: Colors.white.withOpacity(0.09)),
                              ),
                              child: Form(
                                key: _formKey,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Connexion', style: ZiriaText.headingLarge()),
                                    const SizedBox(height: 4),
                                    Text('Accédez à votre espace ZirIA', style: ZiriaText.bodySmall()),
                                    const SizedBox(height: 28),

                                    // Error
                                    if (auth.error != null) ...[
                                      _ErrorBanner(message: auth.error!),
                                      const SizedBox(height: 20),
                                    ],

                                    // Email
                                    _ZirField(
                                      controller: _emailCtrl,
                                      label: 'Adresse email',
                                      hint: 'vous@exemple.tn',
                                      icon: Icons.email_outlined,
                                      keyboardType: TextInputType.emailAddress,
                                      action: TextInputAction.next,
                                      isFocused: _emailFocused,
                                      onFocusChange: (f) => setState(() => _emailFocused = f),
                                      validator: (v) {
                                        if (v == null || v.isEmpty) return 'Email requis';
                                        if (!v.contains('@')) return 'Email invalide';
                                        return null;
                                      },
                                    ),
                                    const SizedBox(height: 16),

                                    // Password
                                    _ZirField(
                                      controller: _passwordCtrl,
                                      label: 'Mot de passe',
                                      hint: '••••••••',
                                      icon: Icons.lock_outline_rounded,
                                      obscure: _obscurePass,
                                      action: TextInputAction.done,
                                      isFocused: _passFocused,
                                      onFocusChange: (f) => setState(() => _passFocused = f),
                                      onSubmit: (_) => _submit(),
                                      validator: (v) => (v == null || v.isEmpty) ? 'Mot de passe requis' : null,
                                      suffix: GestureDetector(
                                        onTap: () => setState(() => _obscurePass = !_obscurePass),
                                        child: Icon(
                                          _obscurePass ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                          color: ZiriaColors.textMuted, size: 20,
                                        ),
                                      ),
                                    ),

                                    // Forgot password
                                    Align(
                                      alignment: Alignment.centerRight,
                                      child: Padding(
                                        padding: const EdgeInsets.only(top: 10),
                                        child: Text('Mot de passe oublié ?',
                                          style: ZiriaText.bodySmall(color: ZiriaColors.accentEmerald, fontWeight: FontWeight.w600)),
                                      ),
                                    ),

                                    const SizedBox(height: 28),

                                    // CTA
                                    ZirGradientButton(
                                      label: 'Se connecter',
                                      icon: Icons.arrow_forward_rounded,
                                      isLoading: auth.isLoading,
                                      onPressed: auth.isLoading ? () {} : _submit,
                                      height: 58,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 28),

                    // Register link
                    FadeTransition(
                      opacity: _cardFade,
                      child: GestureDetector(
                        onTap: () => context.push('/register'),
                        child: RichText(text: TextSpan(
                          text: 'Pas encore de compte ? ',
                          style: ZiriaText.bodyMedium(color: ZiriaColors.textSecondary),
                          children: [
                            TextSpan(text: 'Créer un compte',
                              style: ZiriaText.bodyMedium(color: ZiriaColors.accentEmerald, fontWeight: FontWeight.w700)),
                          ],
                        )),
                      ),
                    ),

                    const SizedBox(height: 48),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── SHARED FORM COMPONENTS ───────────────────────────────────────────────────

class _ZirField extends StatelessWidget {
  final TextEditingController controller;
  final String label, hint;
  final IconData icon;
  final bool obscure, isFocused;
  final TextInputType keyboardType;
  final TextInputAction action;
  final String? Function(String?)? validator;
  final void Function(String)? onSubmit;
  final void Function(bool)? onFocusChange;
  final Widget? suffix;

  const _ZirField({
    required this.controller,
    required this.label,
    required this.hint,
    required this.icon,
    required this.isFocused,
    this.obscure = false,
    this.keyboardType = TextInputType.text,
    this.action = TextInputAction.next,
    this.validator,
    this.onSubmit,
    this.onFocusChange,
    this.suffix,
  });

  @override
  Widget build(BuildContext context) {
    return Focus(
      onFocusChange: onFocusChange,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: isFocused
              ? ZiriaColors.accentEmerald.withOpacity(0.06)
              : Colors.white.withOpacity(0.04),
          border: Border.all(
            color: isFocused
                ? ZiriaColors.accentEmerald.withOpacity(0.4)
                : Colors.white.withOpacity(0.08),
            width: isFocused ? 1.5 : 1.0,
          ),
        ),
        child: TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          textInputAction: action,
          obscureText: obscure,
          onFieldSubmitted: onSubmit,
          validator: validator,
          style: ZiriaText.bodyLarge(color: ZiriaColors.textPrimary),
          decoration: InputDecoration(
            labelText: label,
            hintText: hint,
            labelStyle: ZiriaText.bodySmall(
              color: isFocused ? ZiriaColors.accentEmerald : ZiriaColors.textMuted,
              fontWeight: FontWeight.w600,
            ),
            hintStyle: ZiriaText.bodyMedium(color: ZiriaColors.textMuted.withOpacity(0.5)),
            prefixIcon: Padding(
              padding: const EdgeInsets.all(14),
              child: Icon(icon, color: isFocused ? ZiriaColors.accentEmerald : ZiriaColors.textMuted, size: 20),
            ),
            suffixIcon: suffix != null ? Padding(padding: const EdgeInsets.all(14), child: suffix) : null,
            filled: false,
            border: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          ),
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  final String message;
  const _ErrorBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: ZiriaColors.errorRed.withOpacity(0.12),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: ZiriaColors.errorRed.withOpacity(0.35)),
      ),
      child: Row(children: [
        const Icon(Icons.error_outline_rounded, color: ZiriaColors.errorRed, size: 18),
        const SizedBox(width: 10),
        Expanded(child: Text(message, style: ZiriaText.bodySmall(color: ZiriaColors.errorRed))),
      ]),
    );
  }
}

// ─── BACKGROUND PAINTER ───────────────────────────────────────────────────────
class _LoginBgPainter extends CustomPainter {
  final double rotation;
  _LoginBgPainter(this.rotation);

  @override
  void paint(Canvas canvas, Size size) {
    // Soft ambient orbs
    final positions = [
      Offset(size.width * 0.15, size.height * 0.12),
      Offset(size.width * 0.85, size.height * 0.25),
      Offset(size.width * 0.5,  size.height * 0.72),
    ];
    final colors = [
      ZiriaColors.accentEmerald.withOpacity(0.07),
      ZiriaColors.primaryGreen.withOpacity(0.05),
      ZiriaColors.infoBlue.withOpacity(0.05),
    ];
    for (int i = 0; i < positions.length; i++) {
      final dx = math.cos(rotation + i * 2.0) * 20;
      final dy = math.sin(rotation + i * 2.0) * 20;
      canvas.drawCircle(
        positions[i].translate(dx, dy),
        size.width * 0.35,
        Paint()..shader = RadialGradient(colors: [colors[i], Colors.transparent])
            .createShader(Rect.fromCircle(center: positions[i], radius: size.width * 0.35)),
      );
    }
    // Dot pattern
    final dot = Paint()..color = Colors.white.withOpacity(0.018);
    const sp = 26.0;
    for (double x = 0; x < size.width; x += sp) {
      for (double y = 0; y < size.height; y += sp) {
        canvas.drawCircle(Offset(x, y), 1.0, dot);
      }
    }
  }

  @override
  bool shouldRepaint(_LoginBgPainter old) => old.rotation != rotation;
}
