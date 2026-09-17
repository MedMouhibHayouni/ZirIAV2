// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'marketplace_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$marketplaceRepositoryHash() =>
    r'b9e4d2384bf1742769d37010b42ca1e3cecb1cb1';

/// See also [marketplaceRepository].
@ProviderFor(marketplaceRepository)
final marketplaceRepositoryProvider =
    AutoDisposeProvider<MarketplaceRepository>.internal(
  marketplaceRepository,
  name: r'marketplaceRepositoryProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$marketplaceRepositoryHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef MarketplaceRepositoryRef
    = AutoDisposeProviderRef<MarketplaceRepository>;
String _$recommendedProductsHash() =>
    r'74befb9783fd50006996883e39878cf3a7883cdc';

/// Copied from Dart SDK
class _SystemHash {
  _SystemHash._();

  static int combine(int hash, int value) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + value);
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x0007ffff & hash) << 10));
    return hash ^ (hash >> 6);
  }

  static int finish(int hash) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x03ffffff & hash) << 3));
    // ignore: parameter_assignments
    hash = hash ^ (hash >> 11);
    return 0x1fffffff & (hash + ((0x00003fff & hash) << 15));
  }
}

/// See also [recommendedProducts].
@ProviderFor(recommendedProducts)
const recommendedProductsProvider = RecommendedProductsFamily();

/// See also [recommendedProducts].
class RecommendedProductsFamily
    extends Family<AsyncValue<List<MarketplaceProduct>>> {
  /// See also [recommendedProducts].
  const RecommendedProductsFamily();

  /// See also [recommendedProducts].
  RecommendedProductsProvider call(
    String disease,
  ) {
    return RecommendedProductsProvider(
      disease,
    );
  }

  @override
  RecommendedProductsProvider getProviderOverride(
    covariant RecommendedProductsProvider provider,
  ) {
    return call(
      provider.disease,
    );
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'recommendedProductsProvider';
}

/// See also [recommendedProducts].
class RecommendedProductsProvider
    extends AutoDisposeFutureProvider<List<MarketplaceProduct>> {
  /// See also [recommendedProducts].
  RecommendedProductsProvider(
    String disease,
  ) : this._internal(
          (ref) => recommendedProducts(
            ref as RecommendedProductsRef,
            disease,
          ),
          from: recommendedProductsProvider,
          name: r'recommendedProductsProvider',
          debugGetCreateSourceHash:
              const bool.fromEnvironment('dart.vm.product')
                  ? null
                  : _$recommendedProductsHash,
          dependencies: RecommendedProductsFamily._dependencies,
          allTransitiveDependencies:
              RecommendedProductsFamily._allTransitiveDependencies,
          disease: disease,
        );

  RecommendedProductsProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.disease,
  }) : super.internal();

  final String disease;

  @override
  Override overrideWith(
    FutureOr<List<MarketplaceProduct>> Function(RecommendedProductsRef provider)
        create,
  ) {
    return ProviderOverride(
      origin: this,
      override: RecommendedProductsProvider._internal(
        (ref) => create(ref as RecommendedProductsRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        disease: disease,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<List<MarketplaceProduct>> createElement() {
    return _RecommendedProductsProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is RecommendedProductsProvider && other.disease == disease;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, disease.hashCode);

    return _SystemHash.finish(hash);
  }
}

mixin RecommendedProductsRef
    on AutoDisposeFutureProviderRef<List<MarketplaceProduct>> {
  /// The parameter `disease` of this provider.
  String get disease;
}

class _RecommendedProductsProviderElement
    extends AutoDisposeFutureProviderElement<List<MarketplaceProduct>>
    with RecommendedProductsRef {
  _RecommendedProductsProviderElement(super.provider);

  @override
  String get disease => (origin as RecommendedProductsProvider).disease;
}
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member
