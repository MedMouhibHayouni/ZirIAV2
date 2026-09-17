import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../../core/network/api_client_provider.dart';

part 'marketplace_repository.g.dart';

class MarketplaceProduct {
  final String id;
  final String name;
  final double price;
  final String unit;
  final String supplier;

  MarketplaceProduct({
    required this.id,
    required this.name,
    required this.price,
    required this.unit,
    required this.supplier,
  });

  factory MarketplaceProduct.fromJson(Map<String, dynamic> json) {
    return MarketplaceProduct(
      id: json['id'] ?? '',
      name: json['name'] ?? 'Produit',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      unit: json['unit'] ?? 'unité',
      supplier: json['supplier'] ?? 'Fournisseur Inconnu',
    );
  }
}

class MarketplaceRepository {
  final Dio _dio;

  MarketplaceRepository(this._dio);

  Future<List<MarketplaceProduct>> getTreatmentProducts(String disease) async {
    try {
      final response =
          await _dio.get('/marketplace/products/treatment', queryParameters: {
        'disease': disease,
      });
      final List<dynamic> data = response.data;
      return data
          .map<MarketplaceProduct>((e) => MarketplaceProduct.fromJson(e))
          .toList();
    } catch (e) {
      // Return an empty list if offline or error, to show an empty state gracefully
      return [];
    }
  }
}

@riverpod
MarketplaceRepository marketplaceRepository(MarketplaceRepositoryRef ref) {
  return MarketplaceRepository(ref.watch(apiClientProvider));
}

@riverpod
Future<List<MarketplaceProduct>> recommendedProducts(
    RecommendedProductsRef ref, String disease) {
  return ref.watch(marketplaceRepositoryProvider).getTreatmentProducts(disease);
}
