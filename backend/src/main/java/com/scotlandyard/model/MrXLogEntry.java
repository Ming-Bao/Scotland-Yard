package com.scotlandyard.model;

public class MrXLogEntry {
    private final int round;
    private final int leg;          // 1 for normal / double-first; 2 for double-second
    private final TicketType ticketUsed;
    private final Integer nodeId;   // non-null only on reveal rounds (final leg)

    public MrXLogEntry(int round, int leg, TicketType ticketUsed, Integer nodeId) {
        this.round = round;
        this.leg = leg;
        this.ticketUsed = ticketUsed;
        this.nodeId = nodeId;
    }

    public int getRound()           { return round; }
    public int getLeg()             { return leg; }
    public TicketType getTicketUsed() { return ticketUsed; }
    public Integer getNodeId()      { return nodeId; }
}
