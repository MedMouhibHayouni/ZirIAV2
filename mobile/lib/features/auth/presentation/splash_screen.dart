import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';

/// ZirIA Sentinel — Premium Splash Screen v3.0
/// Cinematic animated intro with pulsing orbs, staggered text reveal
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});
  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with TickerProviderStateMixin {
  // Stagger: logo → title → subtitle → loader
  late AnimationController _logoCtrl;
  late AnimationController _textCtrl;
  late AnimationController _pulseCtrl;
  late AnimationController _orbCtrl;

  late Animation<double> _logoScale;
  late Animation<double> _logoFade;
  late Animation<double> _textFade;
  late Animation<Offset> _textSlide;
  late Animation<double> _loaderFade;
  late Animation<double> _pulse;
  late Animation<double> _orbRotate;

  @override
  void initState() {
    super.initState();

    // Logo pop-in
    _logoCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));
    _logoScale = Tween<double>(begin: 0.4, end: 1.0)
        .animate(CurvedAnimation(parent: _logoCtrl, curve: Curves.elasticOut));
    _logoFade = Tween<double>(begin: 0.0, end: 1.0)
        .animate(CurvedAnimation(parent: _logoCtrl, curve: const Interval(0.0, 0.5, curve: Curves.easeOut)));

    // Text slide up
    _textCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
    _textFade = CurvedAnimation(parent: _textCtrl, curve: Curves.easeOut);
    _textSlide = Tween<Offset>(begin: const Offset(0, 0.4), end: Offset.zero)
        .animate(CurvedAnimation(parent: _textCtrl, curve: Curves.easeOutCubic));

    // Glow pulse on logo
    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1800))
      ..repeat(reverse: true);
    _pulse = Tween<double>(begin: 0.35, end: 0.65)
        .animate(CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut));

    // Rotating orbs
    _orbCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 12))
      ..repeat();
    _orbRotate = Tween<double>(begin: 0.0, end: 2 * math.pi)
        .animate(CurvedAnimation(parent: _orbCtrl, curve: Curves.linear));

    // Loader appears after text
    _loaderFade = Tween<double>(begin: 0.0, end: 1.0)
        .animate(CurvedAnimation(parent: _textCtrl, curve: const Interval(0.7, 1.0, curve: Curves.easeOut)));

    // Sequence
    _logoCtrl.forward().then((_) {
      Future.delayed(const Duration(milliseconds: 100), () {
        if (mounted) _textCtrl.forward();
      });
    });
  }

  @override
  void dispose() {
    _logoCtrl.dispose();
    _textCtrl.dispose();
    _pulseCtrl.dispose();
    _orbCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ZiriaColors.bgDeep,
      body: Stack(
        children: [
          // ── Animated background orbs ──────────────────────────────────
          Positioned.fill(
            child: AnimatedBuilder(
              animation: _orbRotate,
              builder: (_, __) => CustomPaint(
                painter: _OrbPainter(rotation: _orbRotate.value),
              ),
            ),
          ),

          // ── Dot grid pattern ──────────────────────────────────────────
          Positioned.fill(child: CustomPaint(painter: _DotGrid())),

          // ── Main content ─────────────────────────────────────────────
          SafeArea(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Logo with pulse glow
                  AnimatedBuilder(
                    animation: _pulse,
                    builder: (_, child) => Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: ZiriaColors.accentEmerald.withOpacity(_pulse.value),
                            blurRadius: 60,
                            spreadRadius: 10,
                          ),
                        ],
                      ),
                      child: child,
                    ),
                    child: FadeTransition(
                      opacity: _logoFade,
                      child: ScaleTransition(
                        scale: _logoScale,
                        child: Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: ZiriaColors.primaryGradient,
                            border: Border.all(color: Colors.white.withOpacity(0.15), width: 2),
                          ),
                          child: const Center(
                            child: Text('Z',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 56,
                                fontWeight: FontWeight.w900,
                                height: 1.0,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 36),

                  // Staggered title
                  SlideTransition(
                    position: _textSlide,
                    child: FadeTransition(
                      opacity: _textFade,
                      child: Column(children: [
                        Text('ZirIA Sentinel',
                          style: GoogleFonts.inter(
                            fontSize: 36, fontWeight: FontWeight.w900,
                            color: Colors.white, letterSpacing: -1.0,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text('زريعة',
                          style: GoogleFonts.tajawal(
                            fontSize: 24, fontWeight: FontWeight.w700,
                            color: ZiriaColors.accentEmerald,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                          decoration: BoxDecoration(
                            border: Border.all(color: ZiriaColors.accentEmerald.withOpacity(0.3)),
                            borderRadius: BorderRadius.circular(20),
                            color: ZiriaColors.accentEmerald.withOpacity(0.06),
                          ),
                          child: Text(
                            'L\'agriculture intelligente en Tunisie 🇹🇳',
                            style: ZiriaText.bodySmall(color: ZiriaColors.textSecondary),
                          ),
                        ),
                      ]),
                    ),
                  ),

                  const SizedBox(height: 64),

                  // Loader
                  FadeTransition(
                    opacity: _loaderFade,
                    child: Column(children: [
                      SizedBox(
                        width: 32, height: 32,
                        child: CircularProgressIndicator(
                          color: ZiriaColors.accentEmerald,
                          strokeWidth: 2.5,
                          backgroundColor: ZiriaColors.accentEmerald.withOpacity(0.1),
                        ),
                      ),
                      const SizedBox(height: 14),
                      Text('Initialisation...', style: ZiriaText.bodySmall(color: ZiriaColors.textMuted)),
                    ]),
                  ),
                ],
              ),
            ),
          ),

          // ── Version footer ────────────────────────────────────────────
          Positioned(
            bottom: 28, left: 0, right: 0,
            child: FadeTransition(
              opacity: _loaderFade,
              child: Text(
                'v3.0.0 · AiKup Tech · Kasserine 🇹🇳',
                textAlign: TextAlign.center,
                style: ZiriaText.label(color: ZiriaColors.textMuted),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── PAINTERS ─────────────────────────────────────────────────────────────────
class _OrbPainter extends CustomPainter {
  final double rotation;
  _OrbPainter({required this.rotation});

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final r = size.width * 0.38;

    for (int i = 0; i < 3; i++) {
      final angle = rotation + (i * 2 * math.pi / 3);
      final x = cx + r * math.cos(angle);
      final y = cy + r * math.sin(angle);
      final colors = [
        ZiriaColors.accentEmerald.withOpacity(0.12),
        ZiriaColors.primaryGreen.withOpacity(0.08),
        ZiriaColors.infoBlue.withOpacity(0.08),
      ];
      canvas.drawCircle(
        Offset(x, y),
        size.width * 0.28,
        Paint()..shader = RadialGradient(colors: [colors[i], Colors.transparent]).createShader(
          Rect.fromCircle(center: Offset(x, y), radius: size.width * 0.28),
        ),
      );
    }
  }

  @override
  bool shouldRepaint(_OrbPainter old) => old.rotation != rotation;
}

class _DotGrid extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.white.withOpacity(0.025)..style = PaintingStyle.fill;
    const spacing = 28.0;
    for (double x = 0; x < size.width; x += spacing) {
      for (double y = 0; y < size.height; y += spacing) {
        canvas.drawCircle(Offset(x, y), 1.2, paint);
      }
    }
  }
  @override
  bool shouldRepaint(_) => false;
}
