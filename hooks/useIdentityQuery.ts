import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EVENTS, captureEvent } from '@/lib/analytics';
import { queryKeys } from '@/lib/queryClient';
import {
  getIdentityStatements,
  createIdentityStatement,
  createIdentityStatements,
  updateIdentityStatement,
  deleteIdentityStatement,
} from '@/lib/identityStatements';

const STALE = {
  identity: 1000 * 60 * 5,
} as const;

export function useIdentityStatements() {
  return useQuery({
    queryKey: queryKeys.identity.all,
    queryFn: getIdentityStatements,
    staleTime: STALE.identity,
  });
}

export function useCreateIdentityStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      statement,
    }: {
      userId: string;
      statement: { statement: string; emoji: string; sort_order: number };
    }) => createIdentityStatement(userId, statement),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: queryKeys.identity.all });
      captureEvent(EVENTS.IDENTITY_CREATED, {
        statement: created.statement,
        emoji: created.emoji,
        is_template: false,
        source: 'settings',
      });
    },
  });
}

export function useCreateIdentityStatements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      statements,
    }: {
      userId: string;
      statements: Array<{ statement: string; emoji: string; sort_order: number }>;
    }) => createIdentityStatements(userId, statements),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.identity.all });
    },
  });
}

export function useUpdateIdentityStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: { statement?: string; emoji?: string; sort_order?: number };
    }) => updateIdentityStatement(id, updates),
    onSuccess: (updated, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.identity.all });
      captureEvent(EVENTS.IDENTITY_UPDATED, {
        identity_id: variables.id,
        fields_changed: Object.keys(variables.updates),
      });
    },
  });
}

export function useDeleteIdentityStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteIdentityStatement(id),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.identity.all });
      captureEvent(EVENTS.IDENTITY_DELETED, {
        identity_id: variables.id,
      });
    },
  });
}

export function useRefreshIdentity() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.identity.all });
  };
}
