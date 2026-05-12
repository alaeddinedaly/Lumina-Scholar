import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private redisPublisher: Redis;
  private subscribers = new Map<string, Redis>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectQueue('chat') private chatQueue: Queue,
  ) {
    this.redisPublisher = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  async handleConnection(client: Socket) {
    try {
      // Extract JWT from httpOnly cookie (JS can't read this, but socket handshake headers include it)
      const cookieHeader = client.handshake.headers.cookie || '';
      const cookieMap: Record<string, string> = {};
      cookieHeader.split(';').forEach(pair => {
        const [key, ...val] = pair.trim().split('=');
        if (key) cookieMap[key.trim()] = decodeURIComponent(val.join('='));
      });
      const token = cookieMap['access_token'] || client.handshake.auth?.token;
      if (!token) throw new Error('No token');
      
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });

      const sessionId = client.handshake.query.sessionId as string;
      if (!sessionId) throw new Error('No session ID');

      // Store in redis
      const sessionData = { userId: payload.sub, tenantId: payload.tenantId };
      await this.redisPublisher.setex(`session:${sessionId}`, 1800, JSON.stringify(sessionData));

      // Create DEDICATED subscriber per socket
      const subscriber = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      });

      this.subscribers.set(client.id, subscriber);

      // Register message handler BEFORE subscribing to avoid missing early messages
      subscriber.on('message', (channel, message) => {
        console.log(`[WS] Redis msg on ${channel}: ${message.substring(0, 60)}`);
        try {
          const parsed = JSON.parse(message);
          if (parsed.type === 'token') {
            client.emit('token_chunk', parsed.content);
          } else if (parsed.type === 'end') {
            client.emit('stream_end', parsed.citations);
            console.log(`[WS] Stream end emitted to ${client.id}`);
          }
        } catch (e) {
          console.error('[WS] Failed to parse redis pubsub message', e);
        }
      });

      // AWAIT subscribe so it's confirmed before any publish can be missed
      await subscriber.subscribe(`stream:${sessionId}`);
      console.log(`[WS] Socket connected: ${client.id} | session: ${sessionId} | subscribed to stream:${sessionId}`);
    } catch (e) {
      console.log(`Socket disconnect (unauth): ${client.id}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    console.log(`Socket disconnected: ${client.id}`);
    const sessionId = client.handshake.query.sessionId as string;
    if (sessionId) {
      await this.redisPublisher.del(`session:${sessionId}`);
    }

    const subscriber = this.subscribers.get(client.id);
    if (subscriber) {
      subscriber.unsubscribe();
      subscriber.quit();
      this.subscribers.delete(client.id);
    }
  }

  @SubscribeMessage('chat_message')
  async handleChatMessage(
    @MessageBody() data: { query: string, courseId: string, sessionId: string, documentId?: string, isPersonal?: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const cookieHeader = client.handshake.headers.cookie || '';
    const cookieMap: Record<string, string> = {};
    cookieHeader.split(';').forEach(pair => {
      const [key, ...val] = pair.trim().split('=');
      if (key) cookieMap[key.trim()] = decodeURIComponent(val.join('='));
    });
    const token = cookieMap['access_token'] || client.handshake.auth?.token;
    const payload = this.jwtService.verify(token, { secret: this.configService.get('JWT_ACCESS_SECRET') });

    const isPersonal = data.isPersonal || data.courseId === 'personal';

    await this.chatQueue.add('process-chat', {
      sessionId: data.sessionId,
      query: data.query,
      courseId: isPersonal ? null : data.courseId,
      documentId: data.documentId,
      userId: payload.sub,
      tenantId: payload.tenantId,
      isPersonal,
    }, {
      removeOnComplete: true
    });
  }

  @SubscribeMessage('tutor_chat')
  async handleTutorChat(
    @MessageBody() data: { query: string, sessionId: string, history?: { role: string, content: string }[] },
    @ConnectedSocket() client: Socket,
  ) {
    const cookieHeader = client.handshake.headers.cookie || '';
    const cookieMap: Record<string, string> = {};
    cookieHeader.split(';').forEach(pair => {
      const [key, ...val] = pair.trim().split('=');
      if (key) cookieMap[key.trim()] = decodeURIComponent(val.join('='));
    });
    const token = cookieMap['access_token'] || client.handshake.auth?.token;
    const payload = this.jwtService.verify(token, { secret: this.configService.get('JWT_ACCESS_SECRET') });

    await this.chatQueue.add('process-tutor', {
      sessionId: data.sessionId,
      query: data.query,
      history: data.history || [],
      userId: payload.sub,
      tenantId: payload.tenantId,
      isTutor: true,
    }, {
      removeOnComplete: true
    });
  }
}
