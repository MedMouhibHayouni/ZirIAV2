import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'api_client.dart';

final apiClientProvider = Provider<Dio>((ref) {
  return ref.watch(dioProvider);
});
