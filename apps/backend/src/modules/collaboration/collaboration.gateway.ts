import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/collaboration',
})
export class CollaborationGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private roomUsers = new Map<string, Map<string, { userId: string; name: string }>>();

  handleDisconnect(client: Socket) {
    for (const [projectId, users] of this.roomUsers.entries()) {
      if (users.has(client.id)) {
        users.delete(client.id);
        this.server.to(projectId).emit('presence_update', Array.from(users.values()));
      }
    }
  }

  @SubscribeMessage('join_project')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { projectId: string; userId: string; name: string },
  ) {
    client.join(payload.projectId);
    if (!this.roomUsers.has(payload.projectId)) {
      this.roomUsers.set(payload.projectId, new Map());
    }
    this.roomUsers.get(payload.projectId)!.set(client.id, {
      userId: payload.userId,
      name: payload.name,
    });
    this.server
      .to(payload.projectId)
      .emit('presence_update', Array.from(this.roomUsers.get(payload.projectId)!.values()));
  }

  @SubscribeMessage('schema_change')
  handleSchemaChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { projectId: string; version: number; updatedBy: string },
  ) {
    client.to(payload.projectId).emit('schema_updated', payload);
  }
}
