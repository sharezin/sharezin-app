'use client';

import { useState, useEffect, useCallback } from 'react';
import { Group, Participant } from '@/types';
import { getGroups, saveGroup, deleteGroup, getParticipantsByGroup } from '@/lib/storage';

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = useCallback(() => {
    try {
      const loadedGroups = getGroups();
      setGroups(loadedGroups);
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createGroup = useCallback((name: string): Group => {
    const newGroup: Group = {
      id: crypto.randomUUID(),
      name,
      participantIds: [],
    };
    
    saveGroup(newGroup);
    loadGroups();
    return newGroup;
  }, [loadGroups]);

  const updateGroup = useCallback((group: Group) => {
    saveGroup(group);
    loadGroups();
  }, [loadGroups]);

  const removeGroup = useCallback((id: string) => {
    deleteGroup(id);
    loadGroups();
  }, [loadGroups]);

  const getGroupParticipants = useCallback((groupId: string): Participant[] => {
    return getParticipantsByGroup(groupId);
  }, []);

  return {
    groups,
    loading,
    createGroup,
    updateGroup,
    removeGroup,
    getGroupParticipants,
    refreshGroups: loadGroups,
  };
}

