import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ZiriaTextField extends StatefulWidget {
  final String? label;
  final String? hint;
  final IconData? prefixIcon;
  final IconData? suffixIcon;
  final bool obscureText;
  final TextEditingController? controller;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final void Function(String)? onSubmitted;
  final int? maxLines;
  final bool enabled;
  final void Function(String)? onChanged;

  const ZiriaTextField({
    super.key,
    this.label,
    this.hint,
    this.prefixIcon,
    this.suffixIcon,
    this.obscureText = false,
    this.controller,
    this.validator,
    this.keyboardType,
    this.textInputAction,
    this.onSubmitted,
    this.maxLines = 1,
    this.enabled = true,
    this.onChanged,
  });

  @override
  State<ZiriaTextField> createState() => _ZiriaTextFieldState();
}

class _ZiriaTextFieldState extends State<ZiriaTextField> {
  bool _obscured = true;

  @override
  void initState() {
    super.initState();
    _obscured = widget.obscureText;
  }

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller:       widget.controller,
      obscureText:      _obscured,
      keyboardType:     widget.keyboardType,
      textInputAction:  widget.textInputAction,
      onFieldSubmitted: widget.onSubmitted,
      maxLines:         _obscured ? 1 : widget.maxLines,
      enabled:          widget.enabled,
      onChanged:        widget.onChanged,
      validator:        widget.validator,
      style: GoogleFonts.inter(fontSize: 14),
      decoration: InputDecoration(
        labelText:   widget.label,
        hintText:    widget.hint,
        prefixIcon:  widget.prefixIcon != null ? Icon(widget.prefixIcon, size: 20) : null,
        suffixIcon: widget.obscureText
            ? IconButton(
                icon: Icon(_obscured ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20),
                onPressed: () => setState(() => _obscured = !_obscured),
              )
            : (widget.suffixIcon != null ? Icon(widget.suffixIcon, size: 20) : null),
      ),
    );
  }
}
