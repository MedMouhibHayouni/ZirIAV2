// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cached_diagnostic.dart';

// **************************************************************************
// IsarCollectionGenerator
// **************************************************************************

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetCachedDiagnosticCollection on Isar {
  IsarCollection<CachedDiagnostic> get cachedDiagnostics => this.collection();
}

const CachedDiagnosticSchema = CollectionSchema(
  name: r'CachedDiagnostic',
  id: 7992971761136790608,
  properties: {
    r'createdAt': PropertySchema(
      id: 0,
      name: r'createdAt',
      type: IsarType.dateTime,
    ),
    r'isSynced': PropertySchema(
      id: 1,
      name: r'isSynced',
      type: IsarType.bool,
    ),
    r'localResultJson': PropertySchema(
      id: 2,
      name: r'localResultJson',
      type: IsarType.string,
    ),
    r'parcelId': PropertySchema(
      id: 3,
      name: r'parcelId',
      type: IsarType.string,
    ),
    r'photoPath': PropertySchema(
      id: 4,
      name: r'photoPath',
      type: IsarType.string,
    ),
    r'userId': PropertySchema(
      id: 5,
      name: r'userId',
      type: IsarType.string,
    )
  },
  estimateSize: _cachedDiagnosticEstimateSize,
  serialize: _cachedDiagnosticSerialize,
  deserialize: _cachedDiagnosticDeserialize,
  deserializeProp: _cachedDiagnosticDeserializeProp,
  idName: r'id',
  indexes: {},
  links: {},
  embeddedSchemas: {},
  getId: _cachedDiagnosticGetId,
  getLinks: _cachedDiagnosticGetLinks,
  attach: _cachedDiagnosticAttach,
  version: '3.1.0+1',
);

int _cachedDiagnosticEstimateSize(
  CachedDiagnostic object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.localResultJson.length * 3;
  {
    final value = object.parcelId;
    if (value != null) {
      bytesCount += 3 + value.length * 3;
    }
  }
  bytesCount += 3 + object.photoPath.length * 3;
  bytesCount += 3 + object.userId.length * 3;
  return bytesCount;
}

void _cachedDiagnosticSerialize(
  CachedDiagnostic object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeDateTime(offsets[0], object.createdAt);
  writer.writeBool(offsets[1], object.isSynced);
  writer.writeString(offsets[2], object.localResultJson);
  writer.writeString(offsets[3], object.parcelId);
  writer.writeString(offsets[4], object.photoPath);
  writer.writeString(offsets[5], object.userId);
}

CachedDiagnostic _cachedDiagnosticDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = CachedDiagnostic();
  object.createdAt = reader.readDateTime(offsets[0]);
  object.id = id;
  object.isSynced = reader.readBool(offsets[1]);
  object.localResultJson = reader.readString(offsets[2]);
  object.parcelId = reader.readStringOrNull(offsets[3]);
  object.photoPath = reader.readString(offsets[4]);
  object.userId = reader.readString(offsets[5]);
  return object;
}

P _cachedDiagnosticDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readDateTime(offset)) as P;
    case 1:
      return (reader.readBool(offset)) as P;
    case 2:
      return (reader.readString(offset)) as P;
    case 3:
      return (reader.readStringOrNull(offset)) as P;
    case 4:
      return (reader.readString(offset)) as P;
    case 5:
      return (reader.readString(offset)) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

Id _cachedDiagnosticGetId(CachedDiagnostic object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _cachedDiagnosticGetLinks(CachedDiagnostic object) {
  return [];
}

void _cachedDiagnosticAttach(
    IsarCollection<dynamic> col, Id id, CachedDiagnostic object) {
  object.id = id;
}

extension CachedDiagnosticQueryWhereSort
    on QueryBuilder<CachedDiagnostic, CachedDiagnostic, QWhere> {
  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterWhere> anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension CachedDiagnosticQueryWhere
    on QueryBuilder<CachedDiagnostic, CachedDiagnostic, QWhereClause> {
  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterWhereClause> idEqualTo(
      Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: id,
        upper: id,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterWhereClause>
      idNotEqualTo(Id id) {
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

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterWhereClause>
      idGreaterThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterWhereClause>
      idLessThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterWhereClause> idBetween(
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

extension CachedDiagnosticQueryFilter
    on QueryBuilder<CachedDiagnostic, CachedDiagnostic, QFilterCondition> {
  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      createdAtEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'createdAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      createdAtGreaterThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'createdAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      createdAtLessThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'createdAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      createdAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'createdAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      idEqualTo(Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      idGreaterThan(
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

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      idLessThan(
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

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      idBetween(
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

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      isSyncedEqualTo(bool value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'isSynced',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      localResultJsonEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'localResultJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      localResultJsonGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'localResultJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      localResultJsonLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'localResultJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      localResultJsonBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'localResultJson',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      localResultJsonStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'localResultJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      localResultJsonEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'localResultJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      localResultJsonContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'localResultJson',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      localResultJsonMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'localResultJson',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      localResultJsonIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'localResultJson',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      localResultJsonIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'localResultJson',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      parcelIdIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNull(
        property: r'parcelId',
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      parcelIdIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNotNull(
        property: r'parcelId',
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      parcelIdEqualTo(
    String? value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'parcelId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      parcelIdGreaterThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'parcelId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      parcelIdLessThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'parcelId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      parcelIdBetween(
    String? lower,
    String? upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'parcelId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      parcelIdStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'parcelId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      parcelIdEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'parcelId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      parcelIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'parcelId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      parcelIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'parcelId',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      parcelIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'parcelId',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      parcelIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'parcelId',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      photoPathEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'photoPath',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      photoPathGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'photoPath',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      photoPathLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'photoPath',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      photoPathBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'photoPath',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      photoPathStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'photoPath',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      photoPathEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'photoPath',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      photoPathContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'photoPath',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      photoPathMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'photoPath',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      photoPathIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'photoPath',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      photoPathIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'photoPath',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      userIdEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      userIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      userIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      userIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'userId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      userIdStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      userIdEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      userIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'userId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      userIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'userId',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      userIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'userId',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterFilterCondition>
      userIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'userId',
        value: '',
      ));
    });
  }
}

extension CachedDiagnosticQueryObject
    on QueryBuilder<CachedDiagnostic, CachedDiagnostic, QFilterCondition> {}

extension CachedDiagnosticQueryLinks
    on QueryBuilder<CachedDiagnostic, CachedDiagnostic, QFilterCondition> {}

extension CachedDiagnosticQuerySortBy
    on QueryBuilder<CachedDiagnostic, CachedDiagnostic, QSortBy> {
  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      sortByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.asc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      sortByCreatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.desc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      sortByIsSynced() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'isSynced', Sort.asc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      sortByIsSyncedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'isSynced', Sort.desc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      sortByLocalResultJson() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'localResultJson', Sort.asc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      sortByLocalResultJsonDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'localResultJson', Sort.desc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      sortByParcelId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'parcelId', Sort.asc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      sortByParcelIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'parcelId', Sort.desc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      sortByPhotoPath() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'photoPath', Sort.asc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      sortByPhotoPathDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'photoPath', Sort.desc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      sortByUserId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.asc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      sortByUserIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.desc);
    });
  }
}

extension CachedDiagnosticQuerySortThenBy
    on QueryBuilder<CachedDiagnostic, CachedDiagnostic, QSortThenBy> {
  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      thenByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.asc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      thenByCreatedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'createdAt', Sort.desc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy> thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      thenByIsSynced() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'isSynced', Sort.asc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      thenByIsSyncedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'isSynced', Sort.desc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      thenByLocalResultJson() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'localResultJson', Sort.asc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      thenByLocalResultJsonDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'localResultJson', Sort.desc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      thenByParcelId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'parcelId', Sort.asc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      thenByParcelIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'parcelId', Sort.desc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      thenByPhotoPath() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'photoPath', Sort.asc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      thenByPhotoPathDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'photoPath', Sort.desc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      thenByUserId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.asc);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QAfterSortBy>
      thenByUserIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'userId', Sort.desc);
    });
  }
}

extension CachedDiagnosticQueryWhereDistinct
    on QueryBuilder<CachedDiagnostic, CachedDiagnostic, QDistinct> {
  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QDistinct>
      distinctByCreatedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'createdAt');
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QDistinct>
      distinctByIsSynced() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'isSynced');
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QDistinct>
      distinctByLocalResultJson({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'localResultJson',
          caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QDistinct>
      distinctByParcelId({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'parcelId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QDistinct>
      distinctByPhotoPath({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'photoPath', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachedDiagnostic, CachedDiagnostic, QDistinct> distinctByUserId(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'userId', caseSensitive: caseSensitive);
    });
  }
}

extension CachedDiagnosticQueryProperty
    on QueryBuilder<CachedDiagnostic, CachedDiagnostic, QQueryProperty> {
  QueryBuilder<CachedDiagnostic, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<CachedDiagnostic, DateTime, QQueryOperations>
      createdAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'createdAt');
    });
  }

  QueryBuilder<CachedDiagnostic, bool, QQueryOperations> isSyncedProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'isSynced');
    });
  }

  QueryBuilder<CachedDiagnostic, String, QQueryOperations>
      localResultJsonProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'localResultJson');
    });
  }

  QueryBuilder<CachedDiagnostic, String?, QQueryOperations> parcelIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'parcelId');
    });
  }

  QueryBuilder<CachedDiagnostic, String, QQueryOperations> photoPathProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'photoPath');
    });
  }

  QueryBuilder<CachedDiagnostic, String, QQueryOperations> userIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'userId');
    });
  }
}
