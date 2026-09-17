// ZirIA Sentinel — Premium Shared Widgets v3.0
// "Emerald Night" Design System Components

import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

// ─── GLASS CARD ───────────────────────────────────────────────────────────────
/// A premium glassmorphism card with blur, border and gradient overlay.
class ZirGlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets? padding;
  final EdgeInsets? margin;
  final double radius;
  final double blurSigma;
  final Gradient? gradient;
  final Border? border;
  final Color? backgroundColor;
  final List<BoxShadow>? boxShadow;
  final VoidCallback? onTap;
  final double? width;
  final double? height;
  final BorderRadius? borderRadius;

  const ZirGlassCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.radius = 24,
    this.blurSigma = 20,
    this.gradient,
    this.border,
    this.backgroundColor,
    this.boxShadow,
    this.onTap,
    this.width,
    this.height,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveBg = backgroundColor ??
        (isDark ? Colors.white.withOpacity(0.04) : Colors.white.withOpacity(0.85));
    final effectiveBorder = border ??
        Border.all(color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.06));
    final effectiveRadius = borderRadius ?? BorderRadius.circular(radius);

    Widget content = Container(
      width: width,
      height: height,
      margin: margin,
      child: ClipRRect(
        borderRadius: effectiveRadius,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blurSigma, sigmaY: blurSigma),
          child: Container(
            padding: padding ?? const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: gradient,
              color: gradient == null ? effectiveBg : null,
              borderRadius: effectiveRadius,
              border: effectiveBorder,
              boxShadow: boxShadow,
            ),
            child: Material(
              type: MaterialType.transparency,
              child: child,
            ),
          ),
        ),
      ),
    );

    if (onTap != null) {
      return GestureDetector(
        onTap: onTap,
        child: content,
      );
    }
    return content;
  }
}

// ─── GRADIENT CARD ────────────────────────────────────────────────────────────
class ZirGradientCard extends StatelessWidget {
  final Widget child;
  final Gradient gradient;
  final EdgeInsets? padding;
  final EdgeInsets? margin;
  final double radius;
  final List<BoxShadow>? boxShadow;
  final VoidCallback? onTap;

  const ZirGradientCard({
    super.key,
    required this.child,
    required this.gradient,
    this.padding,
    this.margin,
    this.radius = 24,
    this.boxShadow,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: margin,
        padding: padding ?? const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(radius),
          boxShadow: boxShadow,
        ),
        child: child,
      ),
    );
  }
}

// ─── ANIMATED KPI CARD ────────────────────────────────────────────────────────
class ZirKpiCard extends StatefulWidget {
  final String label;
  final String value;
  final IconData icon;
  final Gradient gradient;
  final String? badge;
  final Color? badgeColor;
  final VoidCallback? onTap;

  const ZirKpiCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.gradient,
    this.badge,
    this.badgeColor,
    this.onTap,
  });

  @override
  State<ZirKpiCard> createState() => _ZirKpiCardState();
}

class _ZirKpiCardState extends State<ZirKpiCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnim;
  late Animation<double> _glowAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _scaleAnim = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.elasticOut),
    );
    _glowAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _scaleAnim,
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedBuilder(
          animation: _glowAnim,
          builder: (ctx, child) => Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: widget.gradient,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: _extractColor(widget.gradient).withOpacity(0.3 * _glowAnim.value),
                  blurRadius: 20,
                  spreadRadius: -4,
                  offset: const Offset(0, 8),
                ),
              ],
              border: Border.all(color: Colors.white.withOpacity(0.12)),
            ),
            child: child,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(widget.icon, color: Colors.white, size: 20),
                  ),
                  if (widget.badge != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: (widget.badgeColor ?? Colors.white).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white.withOpacity(0.3)),
                      ),
                      child: Text(widget.badge!, style: ZiriaText.label(color: Colors.white)),
                    ),
                ],
              ),
              const Spacer(),
              Text(widget.value, style: ZiriaText.kpiLarge(color: Colors.white)),
              const SizedBox(height: 2),
              Text(widget.label, style: ZiriaText.label(color: Colors.white.withOpacity(0.7))),
            ],
          ),
        ),
      ),
    );
  }

  Color _extractColor(Gradient g) {
    if (g is LinearGradient && g.colors.isNotEmpty) return g.colors.last;
    return ZiriaColors.accentEmerald;
  }
}

// ─── GRADIENT BUTTON ─────────────────────────────────────────────────────────
class ZirGradientButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final Gradient? gradient;
  final bool isLoading;
  final double height;
  final double radius;
  final double? width;

  const ZirGradientButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.gradient,
    this.isLoading = false,
    this.height = 56,
    this.radius = 16,
    this.width,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      type: MaterialType.transparency,
      child: GestureDetector(
      onTap: isLoading ? null : onPressed,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: height,
        width: width,
        decoration: BoxDecoration(
          gradient: onPressed == null || isLoading
              ? const LinearGradient(colors: [Color(0xFF374151), Color(0xFF4B5563)])
              : (gradient ?? ZiriaColors.primaryGradient),
          borderRadius: BorderRadius.circular(radius),
          boxShadow: onPressed != null && !isLoading
              ? [
                  BoxShadow(
                    color: ZiriaColors.accentEmerald.withOpacity(0.3),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ]
              : [],
        ),
        child: Center(
          child: isLoading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    color: Colors.white,
                    strokeWidth: 2.5,
                  ),
                )
              : Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (icon != null) ...[
                      Icon(icon, color: Colors.white, size: 20),
                      const SizedBox(width: 10),
                    ],
                    Text(label, style: ZiriaText.buttonLarge()),
                  ],
                ),
        ),
      ),
    ),);
  }
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
class ZirSectionHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;
  final Widget? leading;

  const ZirSectionHeader({
    super.key,
    required this.title,
    this.actionLabel,
    this.onAction,
    this.leading,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (leading != null) ...[leading!, const SizedBox(width: 10)],
        Expanded(child: Text(title, style: ZiriaText.headingSmall())),
        if (actionLabel != null)
          GestureDetector(
            onTap: onAction,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(
                border: Border.all(color: ZiriaColors.accentEmerald.withOpacity(0.4)),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(actionLabel!, style: ZiriaText.bodySmall(color: ZiriaColors.accentEmerald, fontWeight: FontWeight.w600)),
            ),
          ),
      ],
    );
  }
}

// ─── ALERT CHIP ───────────────────────────────────────────────────────────────
class ZirAlertChip extends StatelessWidget {
  final String label;
  final Color color;
  final IconData? icon;

  const ZirAlertChip({super.key, required this.label, required this.color, this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, color: color, size: 12), const SizedBox(width: 4)],
          Text(label, style: ZiriaText.label(color: color)),
        ],
      ),
    );
  }
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────
class ZirAvatar extends StatelessWidget {
  final String name;
  final double size;
  final Gradient? gradient;
  final String? imageUrl;

  const ZirAvatar({
    super.key,
    required this.name,
    this.size = 44,
    this.gradient,
    this.imageUrl,
  });

  @override
  Widget build(BuildContext context) {
    final initials = name.isNotEmpty
        ? name.trim().split(' ').map((p) => p[0]).take(2).join().toUpperCase()
        : '?';

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: gradient ?? ZiriaColors.primaryGradient,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white.withOpacity(0.15), width: 1.5),
      ),
      child: ClipOval(
        child: imageUrl != null
            ? Image.network(imageUrl!, fit: BoxFit.cover)
            : Center(child: Text(initials, style: ZiriaText.bodySmall(color: Colors.white, fontWeight: FontWeight.w700))),
      ),
    );
  }
}

// ─── HEALTH INDICATOR ─────────────────────────────────────────────────────────
class ZirHealthBar extends StatelessWidget {
  final double value; // 0.0 to 1.0
  final String label;
  final Color? color;

  const ZirHealthBar({super.key, required this.value, required this.label, this.color});

  @override
  Widget build(BuildContext context) {
    final clampedValue = value.clamp(0.0, 1.0);
    final barColor = color ?? (clampedValue > 0.7 ? ZiriaColors.successGreen
        : clampedValue > 0.4 ? ZiriaColors.earthAmber
        : ZiriaColors.errorRed);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: ZiriaText.bodySmall()),
            Text('${(clampedValue * 100).round()}%', style: ZiriaText.bodySmall(color: barColor, fontWeight: FontWeight.w700)),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: LinearProgressIndicator(
            value: clampedValue,
            minHeight: 8,
            backgroundColor: Colors.grey.withOpacity(0.15),
            valueColor: AlwaysStoppedAnimation<Color>(barColor),
          ),
        ),
      ],
    );
  }
}

// ─── FLOATING HEADER APP BAR ──────────────────────────────────────────────────
class ZirFloatingHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget>? actions;
  final Widget? leading;

  const ZirFloatingHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.actions,
    this.leading,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 16,
        left: 20,
        right: 20,
        bottom: 8,
      ),
      child: Row(
        children: [
          if (leading != null) ...[leading!, const SizedBox(width: 14)],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (subtitle != null)
                  Text(subtitle!, style: ZiriaText.label(color: ZiriaColors.accentEmerald)),
                Text(title, style: ZiriaText.headingLarge()),
              ],
            ),
          ),
          if (actions != null) ...actions!,
        ],
      ),
    );
  }
}

// ─── ACTIVITY ITEM ────────────────────────────────────────────────────────────
class ZirActivityItem extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final String time;
  final VoidCallback? onTap;

  const ZirActivityItem({
    super.key,
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.time,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final iconColor = isDark ? ZiriaColors.textPrimary : ZiriaColors.textLight;
    return GestureDetector(
      onTap: onTap,
      child: ZirGlassCard(
        padding: const EdgeInsets.all(14),
        radius: 18,
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: color.withOpacity(0.2)),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: ZiriaText.bodyMedium(color: iconColor, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: ZiriaText.bodySmall(color: isDark ? ZiriaColors.textSecondary : ZiriaColors.textLightMuted), maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(time, style: ZiriaText.label(color: isDark ? ZiriaColors.textMuted : ZiriaColors.textLightMuted)),
          ],
        ),
      ),
    );
  }
}

// ─── NOTIFICATION BADGE ───────────────────────────────────────────────────────
class ZirNotifButton extends StatelessWidget {
  final VoidCallback? onTap;
  final int count;

  const ZirNotifButton({super.key, this.onTap, this.count = 0});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        children: [
          ZirGlassCard(
            padding: const EdgeInsets.all(10),
            radius: 14,
            child: Icon(
              Icons.notifications_outlined,
              color: isDark ? Colors.white : ZiriaColors.textLight,
              size: 22,
            ),
          ),
          if (count > 0)
            Positioned(
              top: 0, right: 0,
              child: Container(
                width: 16, height: 16,
                decoration: const BoxDecoration(color: ZiriaColors.errorRed, shape: BoxShape.circle),
                child: Center(
                  child: Text(
                    count > 9 ? '9+' : '$count',
                    style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ── Backward-compat alias ─────────────────────────────────────────────────────
class ZiriaButton extends ZirGradientButton {
  const ZiriaButton({
    super.key,
    required super.label,
    super.onPressed,
    super.icon,
    super.gradient,
    super.isLoading,
    super.height,
    super.radius,
    super.width,
    bool isOutlined = false, // Simplified
  });
}
