import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../repositories/agent_repository.dart';

part 'chat_notifier.g.dart';

enum MessageStatus { sending, queued, sent, error }

enum MessageSender { farmer, agent }

class ChatMessage {
  final String id;
  final String content;
  final MessageSender sender;
  final MessageStatus status;
  final DateTime timestamp;

  ChatMessage({
    required this.id,
    required this.content,
    required this.sender,
    required this.status,
    required this.timestamp,
  });

  ChatMessage copyWith({MessageStatus? status}) => ChatMessage(
        id: id,
        content: content,
        sender: sender,
        status: status ?? this.status,
        timestamp: timestamp,
      );
}

class ChatState {
  final List<ChatMessage> messages;
  final List<Map<String, dynamic>> conversations;
  final Map<String, List<Map<String, dynamic>>> groupedConversations;
  final String? sessionId;
  final String? dbId;
  final bool isTyping;
  final bool isOffline;
  final bool isListening;

  const ChatState({
    this.messages = const [],
    this.conversations = const [],
    this.groupedConversations = const {},
    this.sessionId,
    this.dbId,
    this.isTyping = false,
    this.isOffline = false,
    this.isListening = false,
  });

  ChatState copyWith({
    List<ChatMessage>? messages,
    List<Map<String, dynamic>>? conversations,
    Map<String, List<Map<String, dynamic>>>? groupedConversations,
    String? sessionId,
    String? dbId,
    bool? isTyping,
    bool? isOffline,
    bool? isListening,
  }) =>
      ChatState(
        messages: messages ?? this.messages,
        conversations: conversations ?? this.conversations,
        groupedConversations: groupedConversations ?? this.groupedConversations,
        sessionId: sessionId ?? this.sessionId,
        dbId: dbId ?? this.dbId,
        isTyping: isTyping ?? this.isTyping,
        isOffline: isOffline ?? this.isOffline,
        isListening: isListening ?? this.isListening,
      );
}

@riverpod
class ChatNotifier extends _$ChatNotifier {
  @override
  FutureOr<ChatState> build() async {
    final repo = ref.read(agentRepositoryProvider);
    try {
      final conversations = await repo.getConversations();
      final grouped = _groupConversations(conversations);

      if (conversations.isNotEmpty) {
        final lastConversation = conversations.first;
        final dbId = lastConversation['id'];
        final sessionId = lastConversation['session_id'] ?? dbId;
        
        final messages = await repo.getSessionMessages(dbId);
        
        final parsedMessages = _parseMessages(messages);

        return ChatState(
          messages: parsedMessages,
          conversations: conversations,
          groupedConversations: grouped,
          sessionId: sessionId,
          dbId: dbId,
        );
      }
      return ChatState(
        conversations: conversations,
        groupedConversations: grouped,
        messages: [_getWelcomeMessage()],
      );
    } catch (e) {
      return ChatState(messages: [_getWelcomeMessage()]);
    }
  }

  Map<String, List<Map<String, dynamic>>> _groupConversations(List<Map<String, dynamic>> convs) {
    final groups = <String, List<Map<String, dynamic>>>{
      'Aujourd\'hui': [],
      'Hier': [],
      'Cette semaine': [],
      'Plus ancien': [],
    };

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final lastWeek = today.subtract(const Duration(days: 7));

    for (final conv in convs) {
      final updated = conv['updated_at'] != null 
          ? DateTime.parse(conv['updated_at']) 
          : DateTime.now();
      final dateOnly = DateTime(updated.year, updated.month, updated.day);

      if (dateOnly.isAtSameMomentAs(today)) {
        groups['Aujourd\'hui']!.add(conv);
      } else if (dateOnly.isAtSameMomentAs(yesterday)) {
        groups['Hier']!.add(conv);
      } else if (dateOnly.isAfter(lastWeek)) {
        groups['Cette semaine']!.add(conv);
      } else {
        groups['Plus ancien']!.add(conv);
      }
    }

    groups.removeWhere((key, value) => value.isEmpty);
    return groups;
  }

  List<ChatMessage> _parseMessages(dynamic messages) {
    return (messages as List).map((m) {
      return ChatMessage(
        id: m['id'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
        content: m['content'] ?? '',
        sender: m['role'] == 'USER' ? MessageSender.farmer : MessageSender.agent,
        status: MessageStatus.sent,
        timestamp: m['created_at'] != null ? DateTime.parse(m['created_at']) : DateTime.now(),
      );
    }).toList();
  }

  ChatMessage _getWelcomeMessage() {
    return ChatMessage(
      id: 'init',
      content: '🌾 Ahlan! Ana ZirIA, mou3ini dyalek. Wash t7eb dir? (Bienvenue! Je suis ton assistant ZirIA. Comment puis-je t\'aider?)',
      sender: MessageSender.agent,
      status: MessageStatus.sent,
      timestamp: DateTime.now(),
    );
  }

  Future<void> loadConversation(String dbId, String sessionId) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(agentRepositoryProvider);
      final conversations = await repo.getConversations();
      final grouped = _groupConversations(conversations);
      final messagesData = await repo.getSessionMessages(dbId);
      final messages = _parseMessages(messagesData);
      
      return ChatState(
        messages: messages,
        conversations: conversations,
        groupedConversations: grouped,
        sessionId: sessionId,
        dbId: dbId,
      );
    });
  }

  Future<void> newConversation() async {
    final conversations = state.value?.conversations ?? [];
    final grouped = state.value?.groupedConversations ?? {};
    state = AsyncData(ChatState(
      conversations: conversations,
      groupedConversations: grouped,
      messages: [_getWelcomeMessage()],
    ));
  }

  Future<void> sendTextMessage(String text) async {
    if (state.value == null) return;
    
    final currentState = state.value!;
    final userMsg = ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      content: text,
      sender: MessageSender.farmer,
      status: MessageStatus.sending,
      timestamp: DateTime.now(),
    );

    state = AsyncData(currentState.copyWith(
      messages: [...currentState.messages, userMsg], 
      isTyping: true
    ));

    try {
      final repo = ref.read(agentRepositoryProvider);
      final responseData = await repo.sendMessage(text, sessionId: currentState.sessionId);

      final reply = responseData['reply'] ?? responseData['text'] ?? 'Pas de réponse du serveur.';
      final newSessionId = responseData['sessionId'] ?? currentState.sessionId;

      final updated = state.value!.messages.map((m) {
        if (m.id == userMsg.id) return m.copyWith(status: MessageStatus.sent);
        return m;
      }).toList();

      final aiMsg = ChatMessage(
        id: '${DateTime.now().millisecondsSinceEpoch}_ai',
        content: reply,
        sender: MessageSender.agent,
        status: MessageStatus.sent,
        timestamp: DateTime.now(),
      );

      // Refresh conversations list in background
      final updatedConversations = await repo.getConversations();
      final grouped = _groupConversations(updatedConversations);

      state = AsyncData(state.value!.copyWith(
        messages: [...updated, aiMsg],
        conversations: updatedConversations,
        groupedConversations: grouped,
        sessionId: newSessionId,
        isTyping: false,
      ));
    } catch (e) {
      final updated = state.value!.messages.map((m) {
        if (m.id == userMsg.id) return m.copyWith(status: MessageStatus.error);
        return m;
      }).toList();
      state = AsyncData(state.value!.copyWith(messages: updated, isTyping: false));
    }
  }

  Future<void> sendAudioMessage(String audioUrl) async {
    await sendTextMessage('🎤 [Audio envoyé]');
  }

  void toggleListening() {
    if (state.value != null) {
      state = AsyncData(state.value!.copyWith(isListening: !state.value!.isListening));
    }
  }
}
