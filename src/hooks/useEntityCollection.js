import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useEntityCollection(entityName, { sort = "-created_date", limit = 500 } = {}) {
  const queryClient = useQueryClient();
  const queryKey = [entityName, sort, limit];

  const { data = [], isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => base44.entities[entityName].list(sort, limit),
  });

  const createItem = useMutation({
    mutationFn: (newItem) => base44.entities[entityName].create(newItem),
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: [entityName] });
      const prevQueries = queryClient.getQueriesData({ queryKey: [entityName] });
      const tempItem = {
        ...newItem,
        id: `temp-${Date.now()}`,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };
      queryClient.setQueriesData({ queryKey: [entityName] }, (old) => {
        if (!Array.isArray(old)) return old;
        return [tempItem, ...old];
      });
      return { prevQueries };
    },
    onError: (_err, _vars, context) => {
      context?.prevQueries?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [entityName] });
    },
  });

  const updateItem = useMutation({
    mutationFn: ({ id, ...data }) => base44.entities[entityName].update(id, data),
    onMutate: async ({ id, ...data }) => {
      await queryClient.cancelQueries({ queryKey: [entityName] });
      const prevQueries = queryClient.getQueriesData({ queryKey: [entityName] });
      queryClient.setQueriesData({ queryKey: [entityName] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((item) => (item.id === id ? { ...item, ...data } : item));
      });
      return { prevQueries };
    },
    onError: (_err, _vars, context) => {
      context?.prevQueries?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [entityName] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: (id) => base44.entities[entityName].delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [entityName] });
      const prevQueries = queryClient.getQueriesData({ queryKey: [entityName] });
      queryClient.setQueriesData({ queryKey: [entityName] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((item) => item.id !== id);
      });
      return { prevQueries };
    },
    onError: (_err, _id, context) => {
      context?.prevQueries?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [entityName] });
    },
  });

  return {
    data,
    isLoading,
    refetch,
    createItem: createItem.mutate,
    updateItem: updateItem.mutate,
    deleteItem: deleteItem.mutate,
  };
}