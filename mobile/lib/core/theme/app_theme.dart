import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

// ─── PALETTE ─────────────────────────────────────────────────────────────────
// ZirIA Sentinel — Design System v3.0 "Emerald Night"
class ZiriaColors {
  // Core brand
  static const Color primaryGreen    = Color(0xFF15803D);
  static const Color accentEmerald   = Color(0xFF22C55E);
  static const Color accentMint      = Color(0xFF86EFAC);
  static const Color earthOcher      = Color(0xFFD97706);
  static const Color earthAmber      = Color(0xFFFBBF24);

  // Dark surfaces
  static const Color bgDeep          = Color(0xFF030712);
  static const Color bgNight         = Color(0xFF0A0E1A);
  static const Color bgCard          = Color(0xFF0F1629);
  static const Color bgCardAlt       = Color(0xFF131B2E);
  static const Color bgGlass         = Color(0xFF1A2540);

  // Light surfaces
  static const Color bgLight         = Color(0xFFF0FDF4);
  static const Color bgLightCard     = Color(0xFFFFFFFF);
  static const Color bgLightGlass    = Color(0xFFF8FFF8);

  // Text
  static const Color textPrimary     = Color(0xFFF1F5F9);
  static const Color textSecondary   = Color(0xFF94A3B8);
  static const Color textMuted       = Color(0xFF475569);
  static const Color textLight       = Color(0xFF1E293B);
  static const Color textLightMuted  = Color(0xFF64748B);

  // Status
  static const Color errorRed        = Color(0xFFEF4444);
  static const Color warningOrange   = Color(0xFFF97316);
  static const Color infoBlue        = Color(0xFF3B82F6);
  static const Color successGreen    = Color(0xFF22C55E);

  // ── Backward-compat aliases (legacy code continues to compile) ──────────────
  static const Color nightBlue       = bgNight;
  static const Color cardDark        = bgCard;
  static const Color cardDarker      = bgDeep;
  static const Color softWhite       = bgLight;
  static const Color textSecondaryD  = textSecondary;
  static const Color textSecondaryL  = textLightMuted;

  // Gradients — rich, premium
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF16A34A), Color(0xFF22C55E), Color(0xFF4ADE80)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient heroGradient = LinearGradient(
    colors: [Color(0xFF030712), Color(0xFF0A1628), Color(0xFF0D2118)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient cardGradient = LinearGradient(
    colors: [Color(0xFF0F1629), Color(0xFF131B2E)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient emeraldGlow = LinearGradient(
    colors: [Color(0xFF052E16), Color(0xFF14532D), Color(0xFF166534)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient dangerGradient = LinearGradient(
    colors: [Color(0xFF7F1D1D), Color(0xFFEF4444)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient goldGradient = LinearGradient(
    colors: [Color(0xFF78350F), Color(0xFFD97706), Color(0xFFFBBF24)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient oceanGradient = LinearGradient(
    colors: [Color(0xFF0C4A6E), Color(0xFF0284C7), Color(0xFF38BDF8)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

// ─── TYPOGRAPHY ───────────────────────────────────────────────────────────────
class ZiriaText {
  // Hero Numbers — for KPIs
  static TextStyle kpiHero({Color? color, double? fontSize, double? letterSpacing}) => GoogleFonts.inter(
    fontSize: fontSize ?? 36, fontWeight: FontWeight.w900, color: color ?? ZiriaColors.textPrimary,
    letterSpacing: letterSpacing ?? -1.5,
  );

  static TextStyle kpiLarge({Color? color, double? fontSize, double? letterSpacing}) => GoogleFonts.inter(
    fontSize: fontSize ?? 28, fontWeight: FontWeight.w800, color: color ?? ZiriaColors.textPrimary,
    letterSpacing: letterSpacing ?? -1.0,
  );

  static TextStyle headingXL({Color? color, double? fontSize, double? letterSpacing}) => GoogleFonts.inter(
    fontSize: fontSize ?? 26, fontWeight: FontWeight.w800, color: color ?? ZiriaColors.textPrimary,
    letterSpacing: letterSpacing ?? -0.5,
  );

  static TextStyle headingLarge({Color? color, double? fontSize, double? letterSpacing}) => GoogleFonts.inter(
    fontSize: fontSize ?? 22, fontWeight: FontWeight.w700, color: color ?? ZiriaColors.textPrimary,
    letterSpacing: letterSpacing ?? -0.3,
  );

  static TextStyle headingMedium({Color? color, double? fontSize, double? letterSpacing}) => GoogleFonts.inter(
    fontSize: fontSize ?? 18, fontWeight: FontWeight.w700, color: color ?? ZiriaColors.textPrimary,
    letterSpacing: letterSpacing,
  );

  static TextStyle headingSmall({Color? color, double? fontSize, double? letterSpacing}) => GoogleFonts.inter(
    fontSize: fontSize ?? 15, fontWeight: FontWeight.w700, color: color ?? ZiriaColors.textPrimary,
    letterSpacing: letterSpacing,
  );

  static TextStyle bodyLarge({Color? color, FontWeight? fontWeight, double? fontSize}) => GoogleFonts.inter(
    fontSize: fontSize ?? 16, fontWeight: fontWeight ?? FontWeight.w400, color: color ?? ZiriaColors.textPrimary,
  );

  static TextStyle bodyMedium({Color? color, FontWeight? fontWeight, double? fontSize}) => GoogleFonts.inter(
    fontSize: fontSize ?? 14, fontWeight: fontWeight ?? FontWeight.w400, color: color ?? ZiriaColors.textSecondary,
  );

  static TextStyle bodySmall({Color? color, FontWeight? fontWeight, double? fontSize}) => GoogleFonts.inter(
    fontSize: fontSize ?? 12, fontWeight: fontWeight ?? FontWeight.w400, color: color ?? ZiriaColors.textMuted,
  );

  static TextStyle label({Color? color, double? fontSize, double? letterSpacing}) => GoogleFonts.inter(
    fontSize: fontSize ?? 11, fontWeight: FontWeight.w600, color: color ?? ZiriaColors.textMuted,
    letterSpacing: letterSpacing ?? 0.8,
  );

  static TextStyle buttonLarge({Color? color, double? fontSize}) => GoogleFonts.inter(
    fontSize: fontSize ?? 16, fontWeight: FontWeight.w700, color: color ?? Colors.white,
    letterSpacing: 0.3,
  );

  // Backward-compat alias
  static TextStyle labelBold({Color? color, double? fontSize}) => GoogleFonts.inter(
    fontSize: fontSize ?? 13, fontWeight: FontWeight.w700, color: color ?? ZiriaColors.accentEmerald,
    letterSpacing: 0.2,
  );

  static TextStyle arabicMedium({Color? color, double? fontSize}) => GoogleFonts.notoSansArabic(
    fontSize: fontSize ?? 16, fontWeight: FontWeight.w600, color: color ?? ZiriaColors.textPrimary,
  );
}

// ─── SHADOWS & EFFECTS ────────────────────────────────────────────────────────
class ZiriaShadows {
  static List<BoxShadow> emeraldGlow = [
    BoxShadow(color: ZiriaColors.accentEmerald.withOpacity(0.25), blurRadius: 20, spreadRadius: -4, offset: const Offset(0, 8)),
  ];
  static List<BoxShadow> cardShadow = [
    BoxShadow(color: Colors.black.withOpacity(0.35), blurRadius: 24, spreadRadius: -6, offset: const Offset(0, 12)),
  ];
  static List<BoxShadow> softShadow = [
    BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 12, offset: const Offset(0, 4)),
  ];
}

// ─── THEMES ───────────────────────────────────────────────────────────────────
class AppTheme {
  static ThemeData get dark {
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ));

    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: ZiriaColors.bgNight,
      cardColor: ZiriaColors.bgCard,
      colorScheme: const ColorScheme.dark(
        primary: ZiriaColors.accentEmerald,
        secondary: ZiriaColors.earthOcher,
        surface: ZiriaColors.bgCard,
        error: ZiriaColors.errorRed,
        onPrimary: Colors.white,
        onSurface: ZiriaColors.textPrimary,
        tertiary: ZiriaColors.infoBlue,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: ZiriaText.headingMedium(color: Colors.white),
        iconTheme: const IconThemeData(color: Colors.white),
        systemOverlayStyle: SystemUiOverlayStyle.light,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: ZiriaColors.bgDeep,
        indicatorColor: ZiriaColors.accentEmerald.withOpacity(0.15),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return ZiriaText.bodySmall(color: ZiriaColors.accentEmerald, fontWeight: FontWeight.w600);
          }
          return ZiriaText.bodySmall(color: ZiriaColors.textMuted);
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: ZiriaColors.accentEmerald);
          }
          return const IconThemeData(color: ZiriaColors.textMuted);
        }),
        elevation: 0,
        height: 64,
        labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
      ),
      textTheme: TextTheme(
        displayLarge: ZiriaText.headingXL(color: ZiriaColors.textPrimary),
        displayMedium: ZiriaText.headingLarge(color: ZiriaColors.textPrimary),
        headlineLarge: ZiriaText.headingLarge(color: ZiriaColors.textPrimary),
        headlineMedium: ZiriaText.headingMedium(color: ZiriaColors.textPrimary),
        headlineSmall: ZiriaText.headingSmall(color: ZiriaColors.textPrimary),
        bodyLarge: ZiriaText.bodyLarge(color: ZiriaColors.textPrimary),
        bodyMedium: ZiriaText.bodyMedium(color: ZiriaColors.textSecondary),
        bodySmall: ZiriaText.bodySmall(color: ZiriaColors.textMuted),
        labelLarge: ZiriaText.label(color: ZiriaColors.textMuted),
      ),
      dividerColor: Colors.white.withOpacity(0.06),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: ZiriaColors.bgGlass,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: ZiriaColors.accentEmerald, width: 1.5),
        ),
        hintStyle: ZiriaText.bodyMedium(color: ZiriaColors.textMuted),
        labelStyle: ZiriaText.bodyMedium(color: ZiriaColors.textSecondary),
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: ZiriaColors.accentEmerald,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: ZiriaText.buttonLarge(),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: ZiriaColors.accentEmerald,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: ZiriaText.buttonLarge(),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: ZiriaColors.bgGlass,
        selectedColor: ZiriaColors.primaryGreen.withOpacity(0.3),
        labelStyle: ZiriaText.bodySmall(color: ZiriaColors.textPrimary),
        side: BorderSide(color: Colors.white.withOpacity(0.1)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: ZiriaColors.bgCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: ZiriaColors.bgCardAlt,
        contentTextStyle: ZiriaText.bodyMedium(color: ZiriaColors.textPrimary),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        behavior: SnackBarBehavior.floating,
        insetPadding: const EdgeInsets.all(16),
      ),
      useMaterial3: true,
    );
  }

  static ThemeData get light {
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ));

    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: ZiriaColors.bgLight,
      cardColor: ZiriaColors.bgLightCard,
      colorScheme: const ColorScheme.light(
        primary: ZiriaColors.primaryGreen,
        secondary: ZiriaColors.earthOcher,
        surface: ZiriaColors.bgLightCard,
        error: ZiriaColors.errorRed,
        onPrimary: Colors.white,
        onSurface: ZiriaColors.textLight,
        tertiary: ZiriaColors.infoBlue,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: ZiriaText.headingMedium(color: ZiriaColors.textLight),
        iconTheme: const IconThemeData(color: ZiriaColors.textLight),
        surfaceTintColor: Colors.transparent,
        systemOverlayStyle: SystemUiOverlayStyle.dark,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: ZiriaColors.primaryGreen.withOpacity(0.1),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return ZiriaText.bodySmall(color: ZiriaColors.primaryGreen, fontWeight: FontWeight.w600);
          }
          return ZiriaText.bodySmall(color: ZiriaColors.textLightMuted);
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: ZiriaColors.primaryGreen);
          }
          return const IconThemeData(color: ZiriaColors.textLightMuted);
        }),
        elevation: 0,
        height: 64,
      ),
      textTheme: TextTheme(
        displayLarge: ZiriaText.headingXL(color: ZiriaColors.textLight),
        displayMedium: ZiriaText.headingLarge(color: ZiriaColors.textLight),
        headlineLarge: ZiriaText.headingLarge(color: ZiriaColors.textLight),
        headlineMedium: ZiriaText.headingMedium(color: ZiriaColors.textLight),
        headlineSmall: ZiriaText.headingSmall(color: ZiriaColors.textLight),
        bodyLarge: ZiriaText.bodyLarge(color: ZiriaColors.textLight),
        bodyMedium: ZiriaText.bodyMedium(color: ZiriaColors.textLightMuted),
        bodySmall: ZiriaText.bodySmall(color: ZiriaColors.textLightMuted),
        labelLarge: ZiriaText.label(color: ZiriaColors.textLightMuted),
      ),
      dividerColor: Colors.black.withOpacity(0.06),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF0FDF4),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.black.withOpacity(0.08)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.black.withOpacity(0.08)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: ZiriaColors.primaryGreen, width: 1.5),
        ),
        hintStyle: ZiriaText.bodyMedium(color: ZiriaColors.textLightMuted),
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: ZiriaColors.primaryGreen,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: ZiriaText.buttonLarge(),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: ZiriaColors.primaryGreen,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: ZiriaText.buttonLarge(),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: const Color(0xFFDCFCE7),
        selectedColor: ZiriaColors.primaryGreen.withOpacity(0.2),
        labelStyle: ZiriaText.bodySmall(color: ZiriaColors.textLight),
        side: BorderSide(color: Colors.black.withOpacity(0.06)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: Colors.white,
        contentTextStyle: ZiriaText.bodyMedium(color: ZiriaColors.textLight),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        behavior: SnackBarBehavior.floating,
        insetPadding: const EdgeInsets.all(16),
      ),
      useMaterial3: true,
    );
  }
}
