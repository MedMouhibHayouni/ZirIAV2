// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cached_stock.dart';

// **************************************************************************
// IsarCollectionGenerator
// **************************************************************************

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetCachedStockCollection on Isar {
  IsarCollection<CachedStock> get cachedStocks => this.collection();
}

const CachedStockSchema = CollectionSchema(
  name: r'CachedStock',
  id: -4824397056740430855,
  properties: {
    r'cropType': PropertySchema(
      id: 0,
      name: r'cropType',
      type: IsarType.string,
    ),
    r'ownerId': PropertySchema(
      id: 1,
      name: r'ownerId',
      type: IsarType.string,
    ),
    r'quantityKg': PropertySchema(
      id: 2,
      name: r'quantityKg',
      type: IsarType.double,
    ),
    r'unit': PropertySchema(
      id: 3,
      name: r'unit',
      type: IsarType.string,
    ),
    r'updatedAt': PropertySchema(
      id: 4,
      name: r'updatedAt',
      type: IsarType.dateTime,
    )
  },
  estimateSize: _cachedStockEstimateSize,
  serialize: _cachedStockSerialize,
  deserialize: _cachedStockDeserialize,
  deserializeProp: _cachedStockDeserializeProp,
  idName: r'id',
  indexes: {},
  links: {},
  embeddedSchemas: {},
  getId: _cachedStockGetId,
  getLinks: _cachedStockGetLinks,
  attach: _cachedStockAttach,
  version: '3.1.0+1',
);

int _cachedStockEstimateSize(
  CachedStock object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.cropType.length * 3;
  bytesCount += 3 + object.ownerId.length * 3;
  bytesCount += 3 + object.unit.length * 3;
  return bytesCount;
}

void _cachedStockSerialize(
  CachedStock object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeString(offsets[0], object.cropType);
  writer.writeString(offsets[1], object.ownerId);
  writer.writeDouble(offsets[2], object.quantityKg);
  writer.writeString(offsets[3], object.unit);
  writer.writeDateTime(offsets[4], object.updatedAt);
}

CachedStock _cachedStockDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = CachedStock();
  object.cropType = reader.readString(offsets[0]);
  object.id = id;
  object.ownerId = reader.readString(offsets[1]);
  object.quantityKg = reader.readDouble(offsets[2]);
  object.unit = reader.readString(offsets[3]);
  object.updatedAt = reader.readDateTime(offsets[4]);
  return object;
}

P _cachedStockDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readString(offset)) as P;
    case 1:
      return (reader.readString(offset)) as P;
    case 2:
      return (reader.readDouble(offset)) as P;
    case 3:
      return (reader.readString(offset)) as P;
    case 4:
      return (reader.readDateTime(offset)) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

Id _cachedStockGetId(CachedStock object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _cachedStockGetLinks(CachedStock object) {
  return [];
}

void _cachedStockAttach(
    IsarCollection<dynamic> col, Id id, CachedStock object) {
  object.id = id;
}

extension CachedStockQueryWhereSort
    on QueryBuilder<CachedStock, CachedStock, QWhere> {
  QueryBuilder<CachedStock, CachedStock, QAfterWhere> anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension CachedStockQueryWhere
    on QueryBuilder<CachedStock, CachedStock, QWhereClause> {
  QueryBuilder<CachedStock, CachedStock, QAfterWhereClause> idEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: id,
        upper: id,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterWhereClause> idNotEqualTo(
      Id id) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            )
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            );
      } else {
        return query
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            )
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            );
      }
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterWhereClause> idGreaterThan(Id id,
      {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterWhereClause> idLessThan(Id id,
      {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterWhereClause> idBetween(
    Id lowerId,
    Id upperId, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: lowerId,
        includeLower: includeLower,
        upper: upperId,
        includeUpper: includeUpper,
      ));
    });
  }
}

extension CachedStockQueryFilter
    on QueryBuilder<CachedStock, CachedStock, QFilterCondition> {
  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> cropTypeEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'cropType',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      cropTypeGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'cropType',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      cropTypeLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'cropType',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> cropTypeBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'cropType',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      cropTypeStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'cropType',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      cropTypeEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'cropType',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      cropTypeContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'cropType',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> cropTypeMatches(
      String pattern,
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'cropType',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      cropTypeIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'cropType',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      cropTypeIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'cropType',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> idEqualTo(
      Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> idGreaterThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> idLessThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> idBetween(
    Id lower,
    Id upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'id',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> ownerIdEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'ownerId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      ownerIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'ownerId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> ownerIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'ownerId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> ownerIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'ownerId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      ownerIdStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'ownerId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> ownerIdEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'ownerId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> ownerIdContains(
      String value,
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'ownerId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> ownerIdMatches(
      String pattern,
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'ownerId',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      ownerIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'ownerId',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      ownerIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'ownerId',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      quantityKgEqualTo(
    double value, {
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'quantityKg',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      quantityKgGreaterThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'quantityKg',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      quantityKgLessThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'quantityKg',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      quantityKgBetween(
    double lower,
    double upper, {
    bool includeLower = true,
    bool includeUpper = true,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'quantityKg',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> unitEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'unit',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> unitGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'unit',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> unitLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'unit',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> unitBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'unit',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> unitStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'unit',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> unitEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'unit',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> unitContains(
      String value,
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'unit',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> unitMatches(
      String pattern,
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'unit',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition> unitIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'unit',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      unitIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'unit',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      updatedAtEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'updatedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      updatedAtGreaterThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'updatedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      updatedAtLessThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'updatedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterFilterCondition>
      updatedAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'updatedAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }
}

extension CachedStockQueryObject
    on QueryBuilder<CachedStock, CachedStock, QFilterCondition> {}

extension CachedStockQueryLinks
    on QueryBuilder<CachedStock, CachedStock, QFilterCondition> {}

extension CachedStockQuerySortBy
    on QueryBuilder<CachedStock, CachedStock, QSortBy> {
  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> sortByCropType() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'cropType', Sort.asc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> sortByCropTypeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'cropType', Sort.desc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> sortByOwnerId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'ownerId', Sort.asc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> sortByOwnerIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'ownerId', Sort.desc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> sortByQuantityKg() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'quantityKg', Sort.asc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> sortByQuantityKgDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'quantityKg', Sort.desc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> sortByUnit() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'unit', Sort.asc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> sortByUnitDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'unit', Sort.desc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> sortByUpdatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.asc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> sortByUpdatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.desc);
    });
  }
}

extension CachedStockQuerySortThenBy
    on QueryBuilder<CachedStock, CachedStock, QSortThenBy> {
  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> thenByCropType() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'cropType', Sort.asc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> thenByCropTypeDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'cropType', Sort.desc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> thenByOwnerId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'ownerId', Sort.asc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> thenByOwnerIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'ownerId', Sort.desc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> thenByQuantityKg() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'quantityKg', Sort.asc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> thenByQuantityKgDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'quantityKg', Sort.desc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> thenByUnit() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'unit', Sort.asc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> thenByUnitDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'unit', Sort.desc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> thenByUpdatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.asc);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QAfterSortBy> thenByUpdatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'updatedAt', Sort.desc);
    });
  }
}

extension CachedStockQueryWhereDistinct
    on QueryBuilder<CachedStock, CachedStock, QDistinct> {
  QueryBuilder<CachedStock, CachedStock, QDistinct> distinctByCropType(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'cropType', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QDistinct> distinctByOwnerId(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'ownerId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QDistinct> distinctByQuantityKg() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'quantityKg');
    });
  }

  QueryBuilder<CachedStock, CachedStock, QDistinct> distinctByUnit(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'unit', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachedStock, CachedStock, QDistinct> distinctByUpdatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'updatedAt');
    });
  }
}

extension CachedStockQueryProperty
    on QueryBuilder<CachedStock, CachedStock, QQueryProperty> {
  QueryBuilder<CachedStock, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<CachedStock, String, QQueryOperations> cropTypeProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'cropType');
    });
  }

  QueryBuilder<CachedStock, String, QQueryOperations> ownerIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'ownerId');
    });
  }

  QueryBuilder<CachedStock, double, QQueryOperations> quantityKgProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'quantityKg');
    });
  }

  QueryBuilder<CachedStock, String, QQueryOperations> unitProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'unit');
    });
  }

  QueryBuilder<CachedStock, DateTime, QQueryOperations> updatedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'updatedAt');
    });
  }
}
