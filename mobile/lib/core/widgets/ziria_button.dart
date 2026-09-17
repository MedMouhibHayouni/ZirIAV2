import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

class ZiriaButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isOutlined;
  final IconData? icon;
  final Color? color;
  final double height;
  final double? width;
  final double fontSize;

  const ZiriaButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
    this.isOutlined = false,
    this.icon,
    this.color,
    this.height = 52,
    this.width,
    this.fontSize = 15,
  });

  @override
  Widget build(BuildContext context) {
    final isDisabled = onPressed == null && !isLoading;

    if (isOutlined) {
      return SizedBox(
        width: width,
        height: height,
        child: Opacity(
          opacity: isDisabled ? 0.5 : 1.0,
          child: OutlinedButton(
            onPressed: isLoading ? null : onPressed,
            style: OutlinedButton.styleFrom(
              side: BorderSide(
                color: color ?? ZiriaColors.accentEmerald,
                width: 1.5,
              ),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              padding:
                  const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            ),
            child: _buildChild(color ?? ZiriaColors.accentEmerald),
          ),
        ),
      );
    }

    return SizedBox(
      width: width,
      height: height,
      child: Opacity(
        opacity: isDisabled ? 0.5 : 1.0,
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: isDisabled || isLoading
                ? LinearGradient(colors: [
                    ZiriaColors.primaryGreen.withOpacity(0.6),
                    ZiriaColors.accentEmerald.withOpacity(0.6)
                  ])
                : const LinearGradient(
                    colors: [
                      ZiriaColors.primaryGreen,
                      ZiriaColors.accentEmerald
                    ],
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                  ),
            borderRadius: BorderRadius.circular(12),
            boxShadow: isDisabled
                ? []
                : [
                    BoxShadow(
                      color: ZiriaColors.accentEmerald.withOpacity(0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    )
                  ],
          ),
          child: ElevatedButton(
            onPressed: isLoading ? null : onPressed,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              foregroundColor: Colors.white,
              shadowColor: Colors.transparent,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              padding:
                  const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            ),
            child: _buildChild(Colors.white),
          ),
        ),
      ),
    );
  }

  Widget _buildChild(Color textColor) {
    if (isLoading) {
      return SizedBox(
        width: 22,
        height: 22,
        child: CircularProgressIndicator(
          color: isOutlined ? ZiriaColors.accentEmerald : Colors.white,
          strokeWidth: 2.5,
        ),
      );
    }
    if (icon != null) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18, color: textColor),
          const SizedBox(width: 8),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: fontSize,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
        ],
      );
    }
    return Text(
      label,
      style: GoogleFonts.inter(
        fontSize: fontSize,
        fontWeight: FontWeight.w600,
        color: textColor,
      ),
    );
  }
}

// ─── Small icon button ─────────────────────────────────────────────────────────
class ZiriaIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final Color? backgroundColor;
  final Color? iconColor;
  final double size;

  const ZiriaIconButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.backgroundColor,
    this.iconColor,
    this.size = 44,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: backgroundColor ??
              (isDark
                  ? Colors.white.withOpacity(0.08)
                  : Colors.black.withOpacity(0.06)),
          borderRadius: BorderRadius.circular(size / 2),
        ),
        child: Icon(
          icon,
          color: iconColor ?? ZiriaColors.accentEmerald,
          size: size * 0.5,
        ),
      ),
    );
  }
}
