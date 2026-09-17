// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cached_parcel.dart';

// **************************************************************************
// IsarCollectionGenerator
// **************************************************************************

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetCachedParcelCollection on Isar {
  IsarCollection<CachedParcel> get cachedParcels => this.collection();
}

const CachedParcelSchema = CollectionSchema(
  name: r'CachedParcel',
  id: 6999512634750310306,
  properties: {
    r'areaHa': PropertySchema(
      id: 0,
      name: r'areaHa',
      type: IsarType.double,
    ),
    r'boundary': PropertySchema(
      id: 1,
      name: r'boundary',
      type: IsarType.string,
    ),
    r'governorate': PropertySchema(
      id: 2,
      name: r'governorate',
      type: IsarType.string,
    ),
    r'hasRisk': PropertySchema(
      id: 3,
      name: r'hasRisk',
      type: IsarType.bool,
    ),
    r'name': PropertySchema(
      id: 4,
      name: r'name',
      type: IsarType.string,
    ),
    r'ownerId': PropertySchema(
      id: 5,
      name: r'ownerId',
      type: IsarType.string,
    ),
    r'remoteId': PropertySchema(
      id: 6,
      name: r'remoteId',
      type: IsarType.string,
    ),
    r'syncedAt': PropertySchema(
      id: 7,
      name: r'syncedAt',
      type: IsarType.dateTime,
    )
  },
  estimateSize: _cachedParcelEstimateSize,
  serialize: _cachedParcelSerialize,
  deserialize: _cachedParcelDeserialize,
  deserializeProp: _cachedParcelDeserializeProp,
  idName: r'id',
  indexes: {
    r'remoteId': IndexSchema(
      id: 6301175856541681032,
      name: r'remoteId',
      unique: true,
      replace: true,
      properties: [
        IndexPropertySchema(
          name: r'remoteId',
          type: IndexType.hash,
          caseSensitive: true,
        )
      ],
    )
  },
  links: {},
  embeddedSchemas: {},
  getId: _cachedParcelGetId,
  getLinks: _cachedParcelGetLinks,
  attach: _cachedParcelAttach,
  version: '3.1.0+1',
);

int _cachedParcelEstimateSize(
  CachedParcel object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.boundary.length * 3;
  bytesCount += 3 + object.governorate.length * 3;
  bytesCount += 3 + object.name.length * 3;
  bytesCount += 3 + object.ownerId.length * 3;
  bytesCount += 3 + object.remoteId.length * 3;
  return bytesCount;
}

void _cachedParcelSerialize(
  CachedParcel object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeDouble(offsets[0], object.areaHa);
  writer.writeString(offsets[1], object.boundary);
  writer.writeString(offsets[2], object.governorate);
  writer.writeBool(offsets[3], object.hasRisk);
  writer.writeString(offsets[4], object.name);
  writer.writeString(offsets[5], object.ownerId);
  writer.writeString(offsets[6], object.remoteId);
  writer.writeDateTime(offsets[7], object.syncedAt);
}

CachedParcel _cachedParcelDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = CachedParcel(
    areaHa: reader.readDouble(offsets[0]),
    boundary: reader.readString(offsets[1]),
    governorate: reader.readString(offsets[2]),
    hasRisk: reader.readBool(offsets[3]),
    name: reader.readString(offsets[4]),
    ownerId: reader.readString(offsets[5]),
    remoteId: reader.readString(offsets[6]),
    syncedAt: reader.readDateTime(offsets[7]),
  );
  object.id = id;
  return object;
}

P _cachedParcelDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readDouble(offset)) as P;
    case 1:
      return (reader.readString(offset)) as P;
    case 2:
      return (reader.readString(offset)) as P;
    case 3:
      return (reader.readBool(offset)) as P;
    case 4:
      return (reader.readString(offset)) as P;
    case 5:
      return (reader.readString(offset)) as P;
    case 6:
      return (reader.readString(offset)) as P;
    case 7:
      return (reader.readDateTime(offset)) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

Id _cachedParcelGetId(CachedParcel object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _cachedParcelGetLinks(CachedParcel object) {
  return [];
}

void _cachedParcelAttach(
    IsarCollection<dynamic> col, Id id, CachedParcel object) {
  object.id = id;
}

extension CachedParcelByIndex on IsarCollection<CachedParcel> {
  Future<CachedParcel?> getByRemoteId(String remoteId) {
    return getByIndex(r'remoteId', [remoteId]);
  }

  CachedParcel? getByRemoteIdSync(String remoteId) {
    return getByIndexSync(r'remoteId', [remoteId]);
  }

  Future<bool> deleteByRemoteId(String remoteId) {
    return deleteByIndex(r'remoteId', [remoteId]);
  }

  bool deleteByRemoteIdSync(String remoteId) {
    return deleteByIndexSync(r'remoteId', [remoteId]);
  }

  Future<List<CachedParcel?>> getAllByRemoteId(List<String> remoteIdValues) {
    final values = remoteIdValues.map((e) => [e]).toList();
    return getAllByIndex(r'remoteId', values);
  }

  List<CachedParcel?> getAllByRemoteIdSync(List<String> remoteIdValues) {
    final values = remoteIdValues.map((e) => [e]).toList();
    return getAllByIndexSync(r'remoteId', values);
  }

  Future<int> deleteAllByRemoteId(List<String> remoteIdValues) {
    final values = remoteIdValues.map((e) => [e]).toList();
    return deleteAllByIndex(r'remoteId', values);
  }

  int deleteAllByRemoteIdSync(List<String> remoteIdValues) {
    final values = remoteIdValues.map((e) => [e]).toList();
    return deleteAllByIndexSync(r'remoteId', values);
  }

  Future<Id> putByRemoteId(CachedParcel object) {
    return putByIndex(r'remoteId', object);
  }

  Id putByRemoteIdSync(CachedParcel object, {bool saveLinks = true}) {
    return putByIndexSync(r'remoteId', object, saveLinks: saveLinks);
  }

  Future<List<Id>> putAllByRemoteId(List<CachedParcel> objects) {
    return putAllByIndex(r'remoteId', objects);
  }

  List<Id> putAllByRemoteIdSync(List<CachedParcel> objects,
      {bool saveLinks = true}) {
    return putAllByIndexSync(r'remoteId', objects, saveLinks: saveLinks);
  }
}

extension CachedParcelQueryWhereSort
    on QueryBuilder<CachedParcel, CachedParcel, QWhere> {
  QueryBuilder<CachedParcel, CachedParcel, QAfterWhere> anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension CachedParcelQueryWhere
    on QueryBuilder<CachedParcel, CachedParcel, QWhereClause> {
  QueryBuilder<CachedParcel, CachedParcel, QAfterWhereClause> idEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: id,
        upper: id,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterWhereClause> idNotEqualTo(
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

  QueryBuilder<CachedParcel, CachedParcel, QAfterWhereClause> idGreaterThan(
      Id id,
      {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterWhereClause> idLessThan(Id id,
      {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterWhereClause> idBetween(
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

  QueryBuilder<CachedParcel, CachedParcel, QAfterWhereClause> remoteIdEqualTo(
      String remoteId) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IndexWhereClause.equalTo(
        indexName: r'remoteId',
        value: [remoteId],
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterWhereClause>
      remoteIdNotEqualTo(String remoteId) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'remoteId',
              lower: [],
              upper: [remoteId],
              includeUpper: false,
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'remoteId',
              lower: [remoteId],
              includeLower: false,
              upper: [],
            ));
      } else {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'remoteId',
              lower: [remoteId],
              includeLower: false,
              upper: [],
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'remoteId',
              lower: [],
              upper: [remoteId],
              includeUpper: false,
            ));
      }
    });
  }
}

extension CachedParcelQueryFilter
    on QueryBuilder<CachedParcel, CachedParcel, QFilterCondition> {
  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition> areaHaEqualTo(
    double value, {
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'areaHa',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      areaHaGreaterThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'areaHa',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      areaHaLessThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'areaHa',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition> areaHaBetween(
    double lower,
    double upper, {
    bool includeLower = true,
    bool includeUpper = true,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'areaHa',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      boundaryEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'boundary',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      boundaryGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'boundary',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      boundaryLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'boundary',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      boundaryBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'boundary',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      boundaryStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'boundary',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      boundaryEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'boundary',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      boundaryContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'boundary',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      boundaryMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'boundary',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      boundaryIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'boundary',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      boundaryIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'boundary',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      governorateEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'governorate',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      governorateGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'governorate',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      governorateLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'governorate',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      governorateBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'governorate',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      governorateStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'governorate',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      governorateEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'governorate',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      governorateContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'governorate',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      governorateMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'governorate',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      governorateIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'governorate',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      governorateIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'governorate',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      hasRiskEqualTo(bool value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'hasRisk',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition> idEqualTo(
      Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition> idGreaterThan(
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

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition> idLessThan(
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

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition> idBetween(
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

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition> nameEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'name',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      nameGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'name',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition> nameLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'name',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition> nameBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'name',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      nameStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'name',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition> nameEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'name',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition> nameContains(
      String value,
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'name',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition> nameMatches(
      String pattern,
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'name',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      nameIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'name',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      nameIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'name',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      ownerIdEqualTo(
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

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
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

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      ownerIdLessThan(
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

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      ownerIdBetween(
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

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
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

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      ownerIdEndsWith(
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

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      ownerIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'ownerId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      ownerIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'ownerId',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      ownerIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'ownerId',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      ownerIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'ownerId',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      remoteIdEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'remoteId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      remoteIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'remoteId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      remoteIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'remoteId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      remoteIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'remoteId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      remoteIdStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'remoteId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      remoteIdEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'remoteId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      remoteIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'remoteId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      remoteIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'remoteId',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      remoteIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'remoteId',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      remoteIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'remoteId',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      syncedAtEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'syncedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      syncedAtGreaterThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'syncedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      syncedAtLessThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'syncedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterFilterCondition>
      syncedAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'syncedAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }
}

extension CachedParcelQueryObject
    on QueryBuilder<CachedParcel, CachedParcel, QFilterCondition> {}

extension CachedParcelQueryLinks
    on QueryBuilder<CachedParcel, CachedParcel, QFilterCondition> {}

extension CachedParcelQuerySortBy
    on QueryBuilder<CachedParcel, CachedParcel, QSortBy> {
  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> sortByAreaHa() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'areaHa', Sort.asc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> sortByAreaHaDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'areaHa', Sort.desc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> sortByBoundary() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'boundary', Sort.asc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> sortByBoundaryDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'boundary', Sort.desc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> sortByGovernorate() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'governorate', Sort.asc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy>
      sortByGovernorateDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'governorate', Sort.desc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> sortByHasRisk() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'hasRisk', Sort.asc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> sortByHasRiskDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'hasRisk', Sort.desc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> sortByName() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'name', Sort.asc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> sortByNameDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'name', Sort.desc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> sortByOwnerId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'ownerId', Sort.asc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> sortByOwnerIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'ownerId', Sort.desc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> sortByRemoteId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'remoteId', Sort.asc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> sortByRemoteIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'remoteId', Sort.desc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> sortBySyncedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'syncedAt', Sort.asc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> sortBySyncedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'syncedAt', Sort.desc);
    });
  }
}

extension CachedParcelQuerySortThenBy
    on QueryBuilder<CachedParcel, CachedParcel, QSortThenBy> {
  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> thenByAreaHa() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'areaHa', Sort.asc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> thenByAreaHaDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'areaHa', Sort.desc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> thenByBoundary() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'boundary', Sort.asc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> thenByBoundaryDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'boundary', Sort.desc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> thenByGovernorate() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'governorate', Sort.asc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy>
      thenByGovernorateDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'governorate', Sort.desc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> thenByHasRisk() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'hasRisk', Sort.asc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> thenByHasRiskDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'hasRisk', Sort.desc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> thenByName() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'name', Sort.asc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> thenByNameDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'name', Sort.desc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> thenByOwnerId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'ownerId', Sort.asc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> thenByOwnerIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'ownerId', Sort.desc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> thenByRemoteId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'remoteId', Sort.asc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> thenByRemoteIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'remoteId', Sort.desc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> thenBySyncedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'syncedAt', Sort.asc);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QAfterSortBy> thenBySyncedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'syncedAt', Sort.desc);
    });
  }
}

extension CachedParcelQueryWhereDistinct
    on QueryBuilder<CachedParcel, CachedParcel, QDistinct> {
  QueryBuilder<CachedParcel, CachedParcel, QDistinct> distinctByAreaHa() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'areaHa');
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QDistinct> distinctByBoundary(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'boundary', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QDistinct> distinctByGovernorate(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'governorate', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QDistinct> distinctByHasRisk() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'hasRisk');
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QDistinct> distinctByName(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'name', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QDistinct> distinctByOwnerId(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'ownerId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QDistinct> distinctByRemoteId(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'remoteId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachedParcel, CachedParcel, QDistinct> distinctBySyncedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'syncedAt');
    });
  }
}

extension CachedParcelQueryProperty
    on QueryBuilder<CachedParcel, CachedParcel, QQueryProperty> {
  QueryBuilder<CachedParcel, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<CachedParcel, double, QQueryOperations> areaHaProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'areaHa');
    });
  }

  QueryBuilder<CachedParcel, String, QQueryOperations> boundaryProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'boundary');
    });
  }

  QueryBuilder<CachedParcel, String, QQueryOperations> governorateProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'governorate');
    });
  }

  QueryBuilder<CachedParcel, bool, QQueryOperations> hasRiskProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'hasRisk');
    });
  }

  QueryBuilder<CachedParcel, String, QQueryOperations> nameProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'name');
    });
  }

  QueryBuilder<CachedParcel, String, QQueryOperations> ownerIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'ownerId');
    });
  }

  QueryBuilder<CachedParcel, String, QQueryOperations> remoteIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'remoteId');
    });
  }

  QueryBuilder<CachedParcel, DateTime, QQueryOperations> syncedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'syncedAt');
    });
  }
}
