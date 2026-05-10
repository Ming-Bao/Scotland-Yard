package com.scotlandyard.model;

import java.util.Map;

public class Player {

    private String id;
    private String name;
    private Role role;
    private Integer nodeId;
    private Map<TicketType, Integer> tickets;

    public Player() {}

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

    public Map<TicketType, Integer> getTickets() { return tickets; }
    public void setTickets(Map<TicketType, Integer> tickets) { this.tickets = tickets; }
}
