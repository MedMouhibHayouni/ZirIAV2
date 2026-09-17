import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

// ─── Status Badge ─────────────────────────────────────────────────────────────
class StatusBadge extends StatelessWidget {
  final String label;
  final Color color;

  const StatusBadge({super.key, required this.label, required this.color});

  factory StatusBadge.fromString(String status) {
    final map = {
      'ACTIVE':      (ZiriaColors.successGreen, 'ACTIF'),
      'INACTIVE':    (ZiriaColors.textMuted, 'INACTIF'),
      'PENDING':     (ZiriaColors.warningOrange, 'EN ATTENTE'),
      'DISPONIBLE':  (ZiriaColors.successGreen, 'DISPONIBLE'),
      'RÉSERVÉ':     (ZiriaColors.infoBlue, 'RÉSERVÉ'),
      'MAINTENANCE': (ZiriaColors.errorRed, 'MAINTENANCE'),
      'CRITICAL':    (ZiriaColors.errorRed, 'CRITIQUE'),
      'HIGH':        (ZiriaColors.warningOrange, 'ÉLEVÉE'),
      'MEDIUM':      (ZiriaColors.earthOcher, 'MODÉRÉE'),
      'LOW':         (ZiriaColors.successGreen, 'FAIBLE'),
      'APPROVED':    (ZiriaColors.successGreen, 'APPROUVÉ'),
      'REJECTED':    (ZiriaColors.errorRed, 'REFUSÉ'),
      'DELIVERED':   (ZiriaColors.successGreen, 'LIVRÉ'),
    };
    final entry = map[status.toUpperCase()];
    return StatusBadge(
      label: entry?.$2 ?? status,
      color: entry?.$1 ?? ZiriaColors.textMuted,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color:        color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border:       Border.all(color: color.withOpacity(0.4)),
      ),
      child: Text(
        label,
        style: GoogleFonts.inter(
          fontSize:   11,
          fontWeight: FontWeight.w700,
          color:      color,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
