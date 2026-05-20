package com.scotlandyard.model;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/*================Turn this into an interface and extend Mr.X and Detectives==================== */
public class Player {

    private String id;
    private String name;
    private Role role;
    private Integer nodeId;
    private Map<TicketType, Integer> tickets = new HashMap<>();

    public Player() { }

    public Player(String id, String name) {
        this.id = id;
        this.name = name;
    }

    public String getId() { return id; }

    public void setId(String id) { this.id = id; }

    public String getName() { return name; }

    public void setName(String name) { this.name = name; }

    public Role getRole() { return role; }

    public void setRole(Role role) { this.role = role; }

    public Integer getNodeId() { return nodeId; }

    public void setNodeId(Integer nodeId) { this.nodeId = nodeId; }

    public Map<TicketType, Integer> getTickets() { return Collections.unmodifiableMap(tickets); }

    public Integer getTicket(TicketType ticket) { return Integer.valueOf(this.tickets.get(ticket)); }

    public void useTicket(TicketType ticket) {
        Integer newTicketValue = this.tickets.get(ticket) - 1;
        if (newTicketValue < 0)
            throw new IllegalStateException("Tickets can't go below 0");
        this.tickets.replace(ticket, newTicketValue);
    }
}
