import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/ziria_card.dart';
import '../../../../core/widgets/ziria_button.dart';
import '../providers/diagnostic_notifier.dart';

// ── Screen ──────────────────────────────────────────────────────────────────
class DiagnosticScreen extends ConsumerStatefulWidget {
  const DiagnosticScreen({super.key});
  @override
  ConsumerState<DiagnosticScreen> createState() => _DiagnosticScreenState();
}

class _DiagnosticScreenState extends ConsumerState<DiagnosticScreen> {
  File? _image;

  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: source);
    if (pickedFile != null) {
      setState(() {
        _image = File(pickedFile.path);
      });
      ref.read(diagnosticNotifierProvider.notifier).reset();
    }
  }

  Future<void> _analyzeImage() async {
    if (_image == null) return;
    await ref.read(diagnosticNotifierProvider.notifier).analyzeImage(_image!.path);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final diagnosticState = ref.watch(diagnosticNotifierProvider);

    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            _buildImageSection(isDark),
            const SizedBox(height: 20),
            
            if (diagnosticState.status == DiagnosticStatus.error)
              Padding(
                padding: const EdgeInsets.only(bottom: 20),
                child: Text(
                  diagnosticState.errorMessage ?? 'Erreur inconnue',
                  style: const TextStyle(color: Colors.red),
                ),
              ),

            if (_image != null && diagnosticState.status == DiagnosticStatus.idle)
              ZiriaButton(
                label: 'Analyser maintenant',
                onPressed: _analyzeImage,
                width: double.infinity,
              ),
              
            if (diagnosticState.status == DiagnosticStatus.analyzing)
              const Column(
                children: [
                  // TODO: Lottie animation here
                  CircularProgressIndicator(color: ZiriaColors.accentEmerald, strokeWidth: 2),
                  SizedBox(height: 16),
                  Text('Analyse en cours...'),
                ],
              ),
              
            if (diagnosticState.status == DiagnosticStatus.result && diagnosticState.result != null)
              _buildResultSection(isDark, diagnosticState),
          ],
        ),
      ),
    );
  }

  Widget _buildImageSection(bool isDark) {
    return Container(
      height: 250,
      width: double.infinity,
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withOpacity(0.05)
            : Colors.black.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white12 : Colors.black12),
      ),
      child: _image == null
          ? Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.camera_alt,
                    size: 48, color: ZiriaColors.textMuted),
                const SizedBox(height: 12),
                Text('Prenez une photo de la plante affectée',
                    style: ZiriaText.bodySmall(color: ZiriaColors.textMuted)),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    ElevatedButton.icon(
                        onPressed: () => _pickImage(ImageSource.camera),
                        icon: const Icon(Icons.photo_camera),
                        label: const Text('Caméra')),
                    const SizedBox(width: 12),
                    OutlinedButton.icon(
                        onPressed: () => _pickImage(ImageSource.gallery),
                        icon: const Icon(Icons.photo_library),
                        label: const Text('Galerie')),
                  ],
                ),
              ],
            )
          : ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.file(_image!, fit: BoxFit.cover),
                  Positioned(
                    top: 10,
                    right: 10,
                    child: IconButton(
                      onPressed: () {
                        setState(() => _image = null);
                        ref.read(diagnosticNotifierProvider.notifier).reset();
                      },
                      icon: const CircleAvatar(
                          backgroundColor: Colors.black54,
                          child: Icon(Icons.close, color: Colors.white)),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildResultSection(bool isDark, DiagnosticState state) {
    final result = state.result!;
    return Column(
      children: [
        if (state.errorMessage != null)
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.orange.withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.orange),
            ),
            child: Row(
              children: [
                const Icon(Icons.cloud_off, color: Colors.orange),
                const SizedBox(width: 12),
                Expanded(child: Text(state.errorMessage!, style: const TextStyle(color: Colors.orange))),
              ],
            ),
          ),
          
        ZiriaCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(result.diseaseNameFr,
                        style: ZiriaText.headingMedium(
                            color:
                                isDark ? Colors.white : ZiriaColors.nightBlue)),
                  ),
                  _buildSeverityBadge(result.severityLabel),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                  'Confiance de l\'IA : ${(result.confidence * 100).toInt()}%',
                  style: ZiriaText.bodySmall(color: ZiriaColors.textMuted)),
              const Divider(height: 24),
              Text('Recommandations',
                  style: ZiriaText.labelBold(
                      color: isDark ? Colors.white : ZiriaColors.nightBlue)),
              const SizedBox(height: 8),
              ...result.recommendations.map((r) => Padding(
                padding: const EdgeInsets.only(bottom: 4.0),
                child: Text('• $r', style: ZiriaText.bodyMedium()),
              )),
            ],
          ),
        ),
        const SizedBox(height: 16),
        ZiriaButton(
          label: state.expertRequestQueued ? 'Demande envoyée' : 'Demander l\'avis d\'un expert',
          isOutlined: true,
          onPressed: state.expertRequestQueued ? () {} : () async {
            await ref.read(diagnosticNotifierProvider.notifier).queueExpertRequest();
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Demande envoyée aux experts (ou mise en file d\'attente).')));
            }
          },
          width: double.infinity,
        ),
      ],
    );
  }

  Widget _buildSeverityBadge(String severity) {
    Color color;
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
      case 'SÉVÈRE':
      case 'ÉLEVÉE':
        color = ZiriaColors.errorRed;
        break;
      case 'MEDIUM':
      case 'MODÉRÉ':
      case 'MODÉRÉE':
        color = ZiriaColors.warningOrange;
        break;
      default:
        color = ZiriaColors.accentEmerald;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
          color: color.withOpacity(0.15),
          borderRadius: BorderRadius.circular(8)),
      child: Text(severity, style: ZiriaText.bodySmall(color: color)),
    );
  }
}
