'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface UseFetchOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useFetch<T>(
  fetcher: () => Promise<T>,
  options: UseFetchOptions<T> = {}
) {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    loading: options.immediate ?? true,
    error: null
  });

  const mountedRef = useRef(true);
  const executeRef = useRef(fetcher);

  useEffect(() => {
    executeRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async () => {
    if (!mountedRef.current) return;

    setState(s => ({ ...s, loading: true, error: null }));

    try {
      const data = await executeRef.current();
      
      if (!mountedRef.current) return;
      
      setState({ data, loading: false, error: null });
      options.onSuccess?.(data);
    } catch (error) {
      if (!mountedRef.current) return;
      
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState({ data: null, loading: false, error: errorMessage });
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [options]);

  useEffect(() => {
    if (options.immediate !== false) {
      execute();
    }
  }, [execute, options.immediate]);

  return {
    ...state,
    refetch: execute
  };
}

export function useFetchWithDeps<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
  options: UseFetchOptions<T> = {}
) {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    loading: true,
    error: null
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    const fetchData = async () => {
      setState(s => ({ ...s, loading: true, error: null }));
      
      try {
        const data = await fetcher();
        if (mountedRef.current) {
          setState({ data, loading: false, error: null });
          options.onSuccess?.(data);
        }
      } catch (error) {
        if (mountedRef.current) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          setState({ data: null, loading: false, error: errorMessage });
          options.onError?.(error instanceof Error ? error : new Error(errorMessage));
        }
      }
    };

    fetchData();

    return () => {
      mountedRef.current = false;
    };
  }, deps);

  const refetch = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    
    try {
      const data = await fetcher();
      if (mountedRef.current) {
        setState({ data, loading: false, error: null });
        options.onSuccess?.(data);
      }
    } catch (error) {
      if (mountedRef.current) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        setState({ data: null, loading: false, error: errorMessage });
        options.onError?.(error instanceof Error ? error : new Error(errorMessage));
      }
    }
  }, [fetcher, options]);

  return { ...state, refetch };
}