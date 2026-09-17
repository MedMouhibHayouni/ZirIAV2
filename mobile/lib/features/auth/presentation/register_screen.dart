import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/zir_design_system.dart';
import '../repositories/auth_repository.dart';

// ─── ROLE DEFINITIONS ─────────────────────────────────────────────────────────
class _RoleDef {
  final String value, label, subtitle;
  final IconData icon;
  final Color color;
  const _RoleDef(this.value, this.label, this.subtitle, this.icon, this.color);
}

const _kRoles = [
  _RoleDef('FARMER',            'Agriculteur',          'Gérez vos parcelles et cultures',   Icons.eco_rounded,               Color(0xFF22C55E)),
  _RoleDef('FARMER_AMBASSADOR', 'Ambassadeur',          'Accompagnez vos agriculteurs',       Icons.handshake_rounded,          Color(0xFF60A5FA)),
  _RoleDef('COOP_PRESIDENT',   'Président SMSA',        'Pilotez votre coopérative',          Icons.domain_rounded,             Color(0xFF34D399)),
  _RoleDef('EXPERT',           'Expert Agronome',        'Diagnostics et recommandations',     Icons.science_rounded,            Color(0xFFA78BFA)),
  _RoleDef('EQUIP_OWNER',      'Propriétaire Matériel', 'Gérez vos équipements',              Icons.agriculture_rounded,        Color(0xFFF87171)),
  _RoleDef('WORKER',           'Ouvrier Agricole',      'Trouvez des offres d\'emploi',       Icons.work_rounded,               Color(0xFFFB923C)),
  _RoleDef('DRIVER',           'Chauffeur',             'Missions de transport agricole',     Icons.local_shipping_rounded,     Color(0xFF2DD4BF)),
  _RoleDef('LAND_OWNER',       'Propriétaire Foncier',  'Gérez vos terrains agricoles',       Icons.landscape_rounded,          Color(0xFFFBBF24)),
  _RoleDef('ADMIN',            'Administrateur',        'Supervision plateforme complète',    Icons.admin_panel_settings_rounded,Color(0xFFF472B6)),
];

const _kGovernorates = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan', 'Bizerte',
  'Béja', 'Jendouba', 'Kef', 'Siliana', 'Sousse', 'Monastir', 'Mahdia',
  'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid', 'Gabès', 'Médenine',
  'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
];

/// ZirIA Sentinel — Premium Register Screen v3.0
/// Step-aware form with visual role picker cards and animated transitions
class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});
  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen>
    with SingleTickerProviderStateMixin {
  // Step: 0 = Role picker, 1 = Personal info
  int _step = 0;

  final _formKey     = GlobalKey<FormState>();
  final _nameCtrl    = TextEditingController();
  final _emailCtrl   = TextEditingController();
  final _phoneCtrl   = TextEditingController();
  final _passCtrl    = TextEditingController();
  final _confCtrl    = TextEditingController();
  String _role       = 'FARMER';
  String _gov        = 'Kasserine';
  bool _obscure      = true;
  bool _isLoading    = false;
  String? _error;

  late AnimationController _stepCtrl;
  late Animation<Offset>   _stepSlide;
  late Animation<double>   _stepFade;

  @override
  void initState() {
    super.initState();
    _stepCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 400));
    _stepSlide = Tween<Offset>(begin: const Offset(0.08, 0), end: Offset.zero)
        .animate(CurvedAnimation(parent: _stepCtrl, curve: Curves.easeOutCubic));
    _stepFade  = CurvedAnimation(parent: _stepCtrl, curve: Curves.easeOut);
    _stepCtrl.forward();
  }

  @override
  void dispose() {
    _nameCtrl.dispose(); _emailCtrl.dispose(); _phoneCtrl.dispose();
    _passCtrl.dispose(); _confCtrl.dispose(); _stepCtrl.dispose();
    super.dispose();
  }

  _RoleDef get _selectedRole => _kRoles.firstWhere((r) => r.value == _role);

  void _nextStep() {
    setState(() => _step = 1);
    _stepCtrl.forward(from: 0);
  }

  void _prevStep() {
    setState(() { _step = 0; _error = null; });
    _stepCtrl.forward(from: 0);
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() { _isLoading = true; _error = null; });
    try {
      await ref.read(authRepositoryProvider).register(
        name: _nameCtrl.text.trim(),
        email: _emailCtrl.text.trim(),
        phone: _phoneCtrl.text.trim(),
        password: _passCtrl.text,
        role: _role,
        governorate: _gov,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Row(children: [
            const Icon(Icons.check_circle_rounded, color: ZiriaColors.accentEmerald, size: 18),
            const SizedBox(width: 8),
            Text('Compte créé ! Connectez-vous.', style: ZiriaText.bodyMedium(color: ZiriaColors.textPrimary)),
          ]),
          backgroundColor: ZiriaColors.bgCard,
        ));
        context.go('/login');
      }
    } catch (_) {
      setState(() => _error = 'Erreur lors de l\'inscription. Vérifiez vos données.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ZiriaColors.bgDeep,
      body: Stack(
        children: [
          // Background
          Positioned.fill(child: CustomPaint(painter: _RegisterBg())),

          SafeArea(
            child: Column(
              children: [
                // ── Top bar ────────────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.fromLTRB(8, 8, 16, 0),
                  child: Row(children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white70, size: 20),
                      onPressed: _step == 1 ? _prevStep : () => context.go('/login'),
                    ),
                    Expanded(child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_step == 0 ? 'Quel est votre rôle ?' : 'Vos informations',
                          style: ZiriaText.headingMedium()),
                        Text(_step == 0 ? 'Étape 1 / 2 — Choisissez votre profil' : 'Étape 2 / 2 — Créez votre compte',
                          style: ZiriaText.bodySmall(color: ZiriaColors.textMuted)),
                      ],
                    )),
                    // Step indicator pills
                    Row(children: [
                      _StepDot(active: _step == 0, done: _step > 0, color: ZiriaColors.accentEmerald),
                      const SizedBox(width: 6),
                      _StepDot(active: _step == 1, done: false, color: ZiriaColors.accentEmerald),
                    ]),
                  ]),
                ),

                // ── Progress bar ───────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 12, 24, 0),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: _step == 0 ? 0.5 : 1.0,
                      backgroundColor: Colors.white.withOpacity(0.06),
                      valueColor: const AlwaysStoppedAnimation<Color>(ZiriaColors.accentEmerald),
                      minHeight: 3,
                    ),
                  ),
                ),

                const SizedBox(height: 20),

                // ── Steps ──────────────────────────────────────────────
                Expanded(
                  child: SlideTransition(
                    position: _stepSlide,
                    child: FadeTransition(
                      opacity: _stepFade,
                      child: _step == 0 ? _buildRolePicker() : _buildInfoForm(),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── STEP 1: Role Picker ────────────────────────────────────────────────────
  Widget _buildRolePicker() {
    return Column(
      children: [
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.35,
            ),
            itemCount: _kRoles.length,
            itemBuilder: (ctx, i) => _RoleCard(
              role: _kRoles[i],
              isSelected: _role == _kRoles[i].value,
              onTap: () => setState(() => _role = _kRoles[i].value),
            ),
          ),
        ),
        // CTA
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: ZirGradientButton(
            label: 'Continuer — ${_selectedRole.label}',
            icon: Icons.arrow_forward_rounded,
            onPressed: _nextStep,
            height: 56,
          ),
        ),
      ],
    );
  }

  // ── STEP 2: Personal Info ─────────────────────────────────────────────────
  Widget _buildInfoForm() {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Selected role preview chip
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: _selectedRole.color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: _selectedRole.color.withOpacity(0.3)),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(_selectedRole.icon, color: _selectedRole.color, size: 16),
                  const SizedBox(width: 8),
                  Text(_selectedRole.label, style: ZiriaText.bodySmall(color: _selectedRole.color, fontWeight: FontWeight.w700)),
                ]),
              ),

              const SizedBox(height: 20),

              if (_error != null) ...[
                _ErrorBanner(message: _error!),
                const SizedBox(height: 16),
              ],

              // Fields
              _ZirField2(controller: _nameCtrl,  label: 'Nom complet',          icon: Icons.person_outline_rounded,
                validator: (v) => (v == null || v.isEmpty) ? 'Nom requis' : null),
              const SizedBox(height: 12),
              _ZirField2(controller: _emailCtrl, label: 'Adresse email',         icon: Icons.email_outlined,
                type: TextInputType.emailAddress,
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Email requis';
                  if (!v.contains('@')) return 'Email invalide';
                  return null;
                }),
              const SizedBox(height: 12),
              _ZirField2(controller: _phoneCtrl, label: 'Téléphone',             icon: Icons.phone_outlined,
                type: TextInputType.phone,
                validator: (v) => (v == null || v.isEmpty) ? 'Téléphone requis' : null),
              const SizedBox(height: 12),
              _ZirField2(controller: _passCtrl,  label: 'Mot de passe',          icon: Icons.lock_outline_rounded,
                obscure: _obscure,
                validator: (v) => (v == null || v.length < 6) ? 'Minimum 6 caractères' : null,
                suffix: GestureDetector(
                  onTap: () => setState(() => _obscure = !_obscure),
                  child: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                    color: ZiriaColors.textMuted, size: 18),
                )),
              const SizedBox(height: 12),
              _ZirField2(controller: _confCtrl,  label: 'Confirmer le mot de passe', icon: Icons.lock_outline_rounded,
                obscure: _obscure,
                validator: (v) => v != _passCtrl.text ? 'Les mots de passe ne correspondent pas' : null),

              const SizedBox(height: 20),

              // Governorate
              _ZirDropdown<String>(
                label: 'Gouvernorat',
                icon: Icons.location_on_outlined,
                value: _gov,
                items: _kGovernorates,
                itemLabel: (g) => g,
                onChanged: (v) => setState(() => _gov = v!),
              ),

              const SizedBox(height: 32),

              ZirGradientButton(
                label: 'Créer mon compte',
                icon: Icons.check_circle_outline_rounded,
                isLoading: _isLoading,
                height: 58,
                onPressed: _isLoading ? () {} : _submit,
              ),

              const SizedBox(height: 20),

              Center(
                child: GestureDetector(
                  onTap: () => context.go('/login'),
                  child: RichText(text: TextSpan(
                    text: 'Déjà un compte ? ',
                    style: ZiriaText.bodySmall(color: ZiriaColors.textSecondary),
                    children: [
                      TextSpan(text: 'Se connecter',
                        style: ZiriaText.bodySmall(color: ZiriaColors.accentEmerald, fontWeight: FontWeight.w700)),
                    ],
                  )),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── ROLE CARD ────────────────────────────────────────────────────────────────
class _RoleCard extends StatelessWidget {
  final _RoleDef role;
  final bool isSelected;
  final VoidCallback onTap;
  const _RoleCard({required this.role, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          color: isSelected ? role.color.withOpacity(0.12) : Colors.white.withOpacity(0.04),
          border: Border.all(
            color: isSelected ? role.color.withOpacity(0.5) : Colors.white.withOpacity(0.07),
            width: isSelected ? 1.5 : 1.0,
          ),
          boxShadow: isSelected ? [
            BoxShadow(color: role.color.withOpacity(0.2), blurRadius: 16, offset: const Offset(0, 6)),
          ] : null,
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(
                    color: role.color.withOpacity(isSelected ? 0.18 : 0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(role.icon, color: role.color, size: 20),
                ),
                const Spacer(),
                if (isSelected)
                  Container(
                    width: 20, height: 20,
                    decoration: BoxDecoration(color: role.color, shape: BoxShape.circle),
                    child: const Icon(Icons.check_rounded, color: Colors.white, size: 13),
                  ),
              ]),
              const Spacer(),
              Text(role.label,
                style: ZiriaText.bodyMedium(
                  color: isSelected ? role.color : ZiriaColors.textPrimary,
                  fontWeight: FontWeight.w700,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              Text(role.subtitle,
                style: ZiriaText.bodySmall(),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── FORM FIELD (register variant) ───────────────────────────────────────────
class _ZirField2 extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final bool obscure;
  final TextInputType type;
  final String? Function(String?)? validator;
  final Widget? suffix;

  const _ZirField2({
    required this.controller,
    required this.label,
    required this.icon,
    this.obscure = false,
    this.type = TextInputType.text,
    this.validator,
    this.suffix,
  });

  @override
  State<_ZirField2> createState() => _ZirField2State();
}

class _ZirField2State extends State<_ZirField2> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    return Focus(
      onFocusChange: (f) => setState(() => _focused = f),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: _focused ? ZiriaColors.accentEmerald.withOpacity(0.05) : Colors.white.withOpacity(0.04),
          border: Border.all(
            color: _focused ? ZiriaColors.accentEmerald.withOpacity(0.4) : Colors.white.withOpacity(0.07),
            width: _focused ? 1.5 : 1.0,
          ),
        ),
        child: TextFormField(
          controller: widget.controller,
          keyboardType: widget.type,
          obscureText: widget.obscure,
          style: ZiriaText.bodyLarge(color: ZiriaColors.textPrimary),
          validator: widget.validator,
          decoration: InputDecoration(
            labelText: widget.label,
            labelStyle: ZiriaText.bodySmall(
              color: _focused ? ZiriaColors.accentEmerald : ZiriaColors.textMuted,
              fontWeight: FontWeight.w600,
            ),
            prefixIcon: Padding(
              padding: const EdgeInsets.all(14),
              child: Icon(widget.icon, color: _focused ? ZiriaColors.accentEmerald : ZiriaColors.textMuted, size: 20),
            ),
            suffixIcon: widget.suffix != null ? Padding(padding: const EdgeInsets.all(14), child: widget.suffix) : null,
            filled: false,
            border: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            errorStyle: ZiriaText.bodySmall(color: ZiriaColors.errorRed),
          ),
        ),
      ),
    );
  }
}

// ─── DROPDOWN ────────────────────────────────────────────────────────────────
class _ZirDropdown<T> extends StatelessWidget {
  final String label;
  final IconData icon;
  final T value;
  final List<T> items;
  final String Function(T) itemLabel;
  final void Function(T?) onChanged;

  const _ZirDropdown({
    required this.label, required this.icon, required this.value,
    required this.items, required this.itemLabel, required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Row(children: [
            Icon(icon, color: ZiriaColors.textMuted, size: 16),
            const SizedBox(width: 6),
            Text(label, style: ZiriaText.bodySmall(color: ZiriaColors.textMuted, fontWeight: FontWeight.w600)),
          ]),
        ),
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            color: Colors.white.withOpacity(0.04),
            border: Border.all(color: Colors.white.withOpacity(0.07)),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<T>(
              value: value,
              isExpanded: true,
              dropdownColor: ZiriaColors.bgCard,
              icon: const Icon(Icons.expand_more_rounded, color: ZiriaColors.textMuted),
              style: ZiriaText.bodyMedium(color: ZiriaColors.textPrimary),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              items: items.map((e) => DropdownMenuItem<T>(value: e, child: Text(itemLabel(e)))).toList(),
              onChanged: onChanged,
            ),
          ),
        ),
      ],
    );
  }
}

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────
class _StepDot extends StatelessWidget {
  final bool active, done;
  final Color color;
  const _StepDot({required this.active, required this.done, required this.color});
  @override
  Widget build(BuildContext context) => AnimatedContainer(
    duration: const Duration(milliseconds: 300),
    width: active ? 20 : 8, height: 8,
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(4),
      color: active ? color : done ? color.withOpacity(0.5) : Colors.white.withOpacity(0.15),
    ),
  );
}

class _ErrorBanner extends StatelessWidget {
  final String message;
  const _ErrorBanner({required this.message});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    decoration: BoxDecoration(
      color: ZiriaColors.errorRed.withOpacity(0.1),
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: ZiriaColors.errorRed.withOpacity(0.3)),
    ),
    child: Row(children: [
      const Icon(Icons.error_outline_rounded, color: ZiriaColors.errorRed, size: 18),
      const SizedBox(width: 10),
      Expanded(child: Text(message, style: ZiriaText.bodySmall(color: ZiriaColors.errorRed))),
    ]),
  );
}

// ─── BACKGROUND ───────────────────────────────────────────────────────────────
class _RegisterBg extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Top gradient block
    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height * 0.35),
      Paint()..shader = const LinearGradient(
        colors: [Color(0xFF030D06), Color(0xFF052E16), Color(0xFF0A0E1A)],
        begin: Alignment.topLeft, end: Alignment.bottomRight,
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height * 0.35)),
    );
    // Dot grid
    final dot = Paint()..color = Colors.white.withOpacity(0.02);
    const sp = 26.0;
    for (double x = 0; x < size.width; x += sp) {
      for (double y = 0; y < size.height; y += sp) {
        canvas.drawCircle(Offset(x, y), 1.0, dot);
      }
    }
    // Soft glow orb top-right
    canvas.drawCircle(
      Offset(size.width * 0.85, size.height * 0.08),
      size.width * 0.3,
      Paint()..shader = RadialGradient(colors: [
        ZiriaColors.accentEmerald.withOpacity(0.1), Colors.transparent,
      ]).createShader(Rect.fromCircle(center: Offset(size.width * 0.85, size.height * 0.08), radius: size.width * 0.3)),
    );
  }
  @override
  bool shouldRepaint(_) => false;
}
