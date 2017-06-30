import React from "react";
import ReactDOM from "react-dom";
import { Layout, Header, Drawer, Navigation, Content, Grid, ProgressBar, Cell, Card, Button } from "react-mdl";

import * as view from "./view.js";

export default class Main extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            "content": ""
        };
        view.registerMain(this);
    }

    onDispatch(TargetComponent) {
        this.setState({
            "content": ( <TargetComponent /> )
        });
    }

    render() {
        return (
            <div>
                <Layout fixedHeader>
                    <Header title={
                        <span style={{marginLeft: "-50px"}}>通中云平台</span>
                    } />
                    <Content>
                        <Grid>
                            <Cell col={12} align="middle" id="main-content">
                                {this.state.content}
                            </Cell>
                        </Grid>
                        <div id="copyright">&copy; 2017 hydrocloud.net.</div>
                    </Content>
                </Layout>
            </div>
        );
    }
}
