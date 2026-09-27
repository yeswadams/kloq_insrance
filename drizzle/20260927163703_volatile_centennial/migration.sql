ALTER TABLE "conversations" ADD COLUMN "proposal_id" text;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "agent_execution_id" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_proposal_id_fleet_proposals_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "fleet_proposals"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_iHjb9d5zZOA9_fkey" FOREIGN KEY ("agent_execution_id") REFERENCES "agent_executions"("id") ON DELETE SET NULL;