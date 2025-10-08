import { findBestMatchingFlow } from '../utils';
import type { Flow } from '@prisma/client';

const flows: Flow[] = [
  { id: '1', name: 'Greeting', trigger: 'hello', status: 'Active', channel: 'whatsapp', archivable: false, deleted: false, triggerType: 'keyword', userId: '1', createdAt: new Date(), updatedAt: new Date(), data: {} },
  { id: '2', name: 'Order Status', trigger: 'order status', status: 'Active', channel: 'whatsapp', archivable: false, deleted: false, triggerType: 'keyword', userId: '1', createdAt: new Date(), updatedAt: new Date(), data: {} },
  { id: '3', name: 'Default', trigger: 'default', status: 'Active', channel: 'whatsapp', archivable: false, deleted: false, triggerType: 'keyword', userId: '1', createdAt: new Date(), updatedAt: new Date(), data: {} },
  { id: '4', name: 'promocao', trigger: 'promoção', status: 'Active', channel: 'whatsapp', archivable: false, deleted: false, triggerType: 'keyword', userId: '1', createdAt: new Date(), updatedAt: new Date(), data: {} },
];

describe('findBestMatchingFlow', () => {
  it('should return the correct flow for an exact match', () => {
    const context = { fullText: 'hello', interactiveTitle: null, interactiveId: null };
    const bestFlow = findBestMatchingFlow(flows, context);
    expect(bestFlow?.id).toBe('1');
  });

  it('should return the correct flow for a multi-word exact match', () => {
    const context = { fullText: 'order status', interactiveTitle: null, interactiveId: null };
    const bestFlow = findBestMatchingFlow(flows, context);
    expect(bestFlow?.id).toBe('2');
  });

  it('should return the default flow when no other flow matches', () => {
    const context = { fullText: 'goodbye', interactiveTitle: null, interactiveId: null };
    const bestFlow = findBestMatchingFlow(flows, context);
    expect(bestFlow?.id).toBe('3');
  });

  it('should handle diacritics in triggers', () => {
    const context = { fullText: 'promocao', interactiveTitle: null, interactiveId: null };
    const bestFlow = findBestMatchingFlow(flows, context);
    expect(bestFlow?.id).toBe('4');
  });

  it('should prioritize exact matches over partial matches', () => {
    const context = { fullText: 'hello there', interactiveTitle: null, interactiveId: null };
    const bestFlow = findBestMatchingFlow(flows, context);
    expect(bestFlow?.id).toBe('1');
  });

  it('should return the first flow if no match is found and there is no default', () => {
    const flowsWithoutDefault = flows.filter(f => f.trigger !== 'default');
    const context = { fullText: 'some random text', interactiveTitle: null, interactiveId: null };
    const bestFlow = findBestMatchingFlow(flowsWithoutDefault, context);
    expect(bestFlow?.id).toBe('1');
  });

  it('should handle interactive message titles', () => {
    const context = { fullText: 'some text', interactiveTitle: 'hello', interactiveId: null };
    const bestFlow = findBestMatchingFlow(flows, context);
    expect(bestFlow?.id).toBe('1');
  });

  it('should handle interactive message ids', () => {
    const context = { fullText: 'some text', interactiveTitle: 'some title', interactiveId: 'hello' };
    const bestFlow = findBestMatchingFlow(flows, context);
    expect(bestFlow?.id).toBe('1');
  });
});